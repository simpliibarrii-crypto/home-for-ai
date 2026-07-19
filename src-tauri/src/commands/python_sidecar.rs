//! Python Sidecar Commands

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tokio::sync::Mutex as TokioMutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PythonBackendConfig {
    pub host: String,
    pub port: u16,
    pub python_path: Option<String>,
    pub script_path: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
}

impl Default for PythonBackendConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 8000,
            python_path: None,
            script_path: "backend/main.py".to_string(),
            args: Vec::new(),
            env: HashMap::new(),
        }
    }
}

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct BackendStatus {
    pub running: bool,
    pub pid: Option<u32>,
    pub url: Option<String>,
    pub error: Option<String>,
}

type BackendState = Arc<TokioMutex<Option<CommandChild>>>;
type StatusState = Arc<TokioMutex<BackendStatus>>;

static BACKEND_STATE: std::sync::OnceLock<BackendState> = std::sync::OnceLock::new();
static STATUS_STATE: std::sync::OnceLock<StatusState> = std::sync::OnceLock::new();

fn backend_state() -> &'static BackendState {
    BACKEND_STATE.get_or_init(|| Arc::new(TokioMutex::new(None)))
}

fn status_state() -> &'static StatusState {
    STATUS_STATE.get_or_init(|| Arc::new(TokioMutex::new(BackendStatus::default())))
}

#[tauri::command]
pub async fn start_python_backend(
    app: AppHandle,
    config: PythonBackendConfig,
) -> Result<BackendStatus, String> {
    {
        let status = status_state().lock().await;
        if status.running {
            return Ok(status.clone());
        }
    }

    let executable = config.python_path.unwrap_or_else(|| {
        if cfg!(target_os = "windows") {
            "python.exe".to_string()
        } else {
            "python3".to_string()
        }
    });

    let mut command = app.shell().command(executable).arg(&config.script_path);
    for argument in &config.args {
        command = command.arg(argument);
    }
    for (key, value) in &config.env {
        command = command.env(key, value);
    }
    let backend_dir = std::path::Path::new(&config.script_path)
        .parent()
        .unwrap_or_else(|| std::path::Path::new("backend"));
    command = command
        .env("PYTHONPATH", backend_dir)
        .env("PORT", config.port.to_string());

    let (mut events, child) = command
        .spawn()
        .map_err(|error| format!("Failed to spawn Python backend: {error}"))?;
    let pid = child.pid();
    *backend_state().lock().await = Some(child);

    let backend_url = format!("http://{}:{}", config.host, config.port);
    {
        let mut status = status_state().lock().await;
        *status = BackendStatus {
            running: true,
            pid: Some(pid),
            url: Some(backend_url.clone()),
            error: None,
        };
    }

    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = events.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let output = String::from_utf8_lossy(&line);
                    tracing::info!("[Python Backend] {}", output.trim());
                    if output.contains("Application startup complete")
                        || output.contains("Uvicorn running on")
                    {
                        let _ = app_handle.emit(
                            "backend:ready",
                            BackendStatus {
                                running: true,
                                pid: Some(pid),
                                url: Some(backend_url.clone()),
                                error: None,
                            },
                        );
                    }
                }
                CommandEvent::Stderr(line) => {
                    tracing::error!(
                        "[Python Backend] {}",
                        String::from_utf8_lossy(&line).trim()
                    );
                }
                CommandEvent::Error(error) => {
                    let message = error.to_string();
                    tracing::error!("[Python Backend] {message}");
                    let mut status = status_state().lock().await;
                    status.running = false;
                    status.error = Some(message.clone());
                    let _ = app_handle.emit("backend:error", status.clone());
                }
                CommandEvent::Terminated(payload) => {
                    tracing::info!("[Python Backend] terminated: {payload:?}");
                    let mut status = status_state().lock().await;
                    status.running = false;
                    status.pid = None;
                    status.url = None;
                    let _ = app_handle.emit("backend:stopped", status.clone());
                }
                _ => {}
            }
        }
    });

    Ok(status_state().lock().await.clone())
}

#[tauri::command]
pub async fn stop_python_backend(app: AppHandle) -> Result<BackendStatus, String> {
    if let Some(child) = backend_state().lock().await.take() {
        child
            .kill()
            .map_err(|error| format!("Failed to stop Python backend: {error}"))?;
    }

    let mut status = status_state().lock().await;
    status.running = false;
    status.pid = None;
    status.url = None;
    let _ = app.emit("backend:stopped", status.clone());
    Ok(status.clone())
}

#[tauri::command]
pub async fn get_backend_status() -> Result<BackendStatus, String> {
    Ok(status_state().lock().await.clone())
}

#[tauri::command]
pub async fn restart_python_backend(
    app: AppHandle,
    config: PythonBackendConfig,
) -> Result<BackendStatus, String> {
    let _ = stop_python_backend(app.clone()).await;
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    start_python_backend(app, config).await
}

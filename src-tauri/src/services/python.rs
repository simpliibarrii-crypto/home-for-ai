//! Python Backend Service

use tauri::{AppHandle, Manager, Emitter};
use tauri_plugin_shell::process::{CommandEvent, CommandChild};
use tauri_plugin_shell::ShellExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex as TokioMutex;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
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
            port: 8080,
            python_path: None,
            script_path: "backend/app/main.py".to_string(),
            args: vec![],
            env: HashMap::new(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
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

fn get_backend_state() -> &'static BackendState {
    BACKEND_STATE.get_or_init(|| Arc::new(TokioMutex::new(None)))
}

fn get_status_state() -> &'static StatusState {
    STATUS_STATE.get_or_init(|| Arc::new(TokioMutex::new(BackendStatus::default())))
}

pub fn init(app_handle: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Initialize Python backend service
    // Auto-start can be triggered from frontend
    Ok(())
}

pub async fn start_backend(
    app_handle: &AppHandle,
    config: PythonBackendConfig,
) -> Result<BackendStatus, String> {
    let state = get_backend_state();
    let status = get_status_state();

    // Check if already running
    {
        let status_guard = status.lock().await;
        if status_guard.running {
            return Ok(status_guard.clone());
        }
    }

    // Determine python path
    let python_cmd = config.python_path.unwrap_or_else(|| {
        if cfg!(target_os = "windows") {
            "python.exe".to_string()
        } else {
            "python3".to_string()
        }
    });

    // Build command
    let mut cmd = tauri_plugin_shell::Command::new(python_cmd);
    cmd.arg(&config.script_path);
    
    for arg in &config.args {
        cmd.arg(arg);
    }

    // Set environment variables
    for (key, value) in &config.env {
        cmd.env(key, value);
    }

    // Add PYTHONPATH for relative imports
    let backend_dir = std::path::Path::new(&config.script_path).parent().unwrap_or(std::path::Path::new("."));
    cmd.env("PYTHONPATH", backend_dir);

    // Spawn the process
    let (mut rx, child) = cmd.spawn().map_err(|e| format!("Failed to spawn python backend: {}", e))?;
    
    let pid = child.pid();
    
    // Update state
    {
        let mut backend_guard = state.lock().await;
        *backend_guard = Some(child);
    }

    // Update status
    let backend_url = format!("http://{}:{}", config.host, config.port);
    {
        let mut status_guard = status.lock().await;
        status_guard.running = true;
        status_guard.pid = Some(pid);
        status_guard.url = Some(backend_url.clone());
        status_guard.error = None;
    }

    // Listen for process output
    let app_handle = app_handle.clone();
    let backend_url_clone = backend_url.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let output = String::from_utf8_lossy(&line);
                    tracing::info!("[Python Backend] {}", output: {}", output.trim());
                    
                    // Check if server started
                    if output.contains("Application startup complete") || 
                       output.contains("Uvicorn running on") ||
                       output.contains("Running on") {
                        let mut status_guard = status.lock().await;
                        status_guard.running = true;
                        drop(status_guard);
                        
                        // Emit event to frontend
                        let _ = app_handle.emit("backend:ready", BackendStatus {
                            running: true,
                            pid: Some(pid),
                            url: Some(backend_url_clone.clone()),
                            error: None,
                        });
                    }
                }
                CommandEvent::Stderr(line) => {
                    let output = String::from_utf8_lossy(&line);
                    tracing::error!("[Python Back Error] {}", output.trim());
                }
                CommandEvent::Error(err) => {
                    tracing::error!("[Python Back Process Error] {}", err);
                    let mut status_guard = status.lock().await;
                    status_guard.running = false;
                    status_guard.error = Some(err.to_string());
                    
                    let _ = app_handle.emit("backend:error", BackendStatus {
                        running: false,
                        pid: None,
                        url: None,
                        error: Some(err.to_string()),
                    });
                }
                CommandEvent::Exit(code) => {
                    tracing::info!("[Python Backend] Exited with code: {:?}", code);
                    let mut status_guard = status.lock().await;
                    status_guard.running = false;
                    status_guard.pid = None;
                    status_guard.url = None;
                    
                    let _ = app_handle.emit("backend:stopped", BackendStatus {
                        running: false,
                        pid: None,
                        url: None,
                        error: Some("Process exited".to_string()),
                    });
                }
                _ => {}
            }
        }
    });

    // Return current status
    let status_guard = status.lock().await;
    Ok(status_guard.clone())
}

pub async fn stop_backend(app_handle: &AppHandle) -> Result<BackendStatus, String> {
    let state = get_backend_state();
    let status = get_status_state();

    let mut backend_guard = state.lock().await;
    if let Some(mut child) = backend_guard.take() {
        child.kill().map_err(|e| format!("Failed to kill python backend: {}", e))?;
    }

    let mut status_guard = status.lock().await;
    status_guard.running = false;
    status_guard.pid = None;
    status_guard.url = None;
    
    let _ = app_handle.emit("backend:stopped", status_guard.clone());
    
    Ok(status_guard.clone())
}

pub async fn get_backend_status() -> Result<BackendStatus, String> {
    let status = get_status_state();
    let status_guard = status.lock().await;
    Ok(status_guard.clone())
}

pub async fn restart_backend(
    app_handle: &AppHandle,
    config: PythonBackendConfig,
) -> Result<BackendStatus, String> {
    let _ = stop_backend(app_handle).await;
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
    start_backend(app_handle, config).await
}
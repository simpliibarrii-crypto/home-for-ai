//! Files Commands

use tauri::{AppHandle, Manager};
use tauri_plugin_fs::FileSystemExt;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
    pub modified: Option<String>,
}

#[tauri::command]
pub async fn read_file(app: AppHandle, path: String) -> Result<String, String> {
    let fs = app.fs();
    fs.read_to_string(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_file(app: AppHandle, path: String, content: String) -> Result<(), String> {
    let fs = app.fs();
    fs.write(&path, content.as_bytes()).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_directory(app: AppHandle, path: String) -> Result<Vec<FileInfo>, String> {
    let fs = app.fs();
    let entries = fs.read_dir(&path).await.map_err(|e| e.to_string())?;
    
    let mut files = Vec::new();
    for entry in entries {
        let file_type = entry.file_type().await.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().await.map_err(|e| e.to_string())?;
        
        files.push(FileInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir: file_type.is_dir(),
            size: if file_type.is_file() { Some(metadata.len()) } else { None },
            modified: metadata.modified().ok().map(|t| {
                chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339()
            }),
        });
    }
    
    Ok(files)
}

#[tauri::command]
pub async fn delete_file(app: AppHandle, path: String) -> Result<(), String> {
    let fs = app.fs();
    fs.remove_file(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_directory(app: AppHandle, path: String) -> Result<(), String> {
    let fs = app.fs();
    fs.create_dir_all(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn copy_file(app: AppHandle, from: String, to: String) -> Result<(), String> {
    let fs = app.fs();
    fs.copy(&from, &to).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn move_file(app: AppHandle, from: String, to: String) -> Result<(), String> {
    let fs = app.fs();
    fs.rename(&from, &to).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn file_exists(app: AppHandle, path: String) -> Result<bool, String> {
    let fs = app.fs();
    Ok(fs.exists(&path).await)
}
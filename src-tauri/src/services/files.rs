//! Files Service

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

pub fn init(app_handle: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Initialize files service
    Ok(())
}

pub async fn read_file(app_handle: &AppHandle, path: &str) -> Result<String, String> {
    let fs = app_handle.fs();
    fs.read_to_string(path).await.map_err(|e| e.to_string())
}

pub async fn write_file(app_handle: &AppHandle, path: &str, content: &str) -> Result<(), String> {
    let fs = app_handle.fs();
    fs.write(path, content.as_bytes()).await.map_err(|e| e.to_string())
}

pub async fn list_directory(app_handle: &AppHandle, path: &str) -> Result<Vec<FileInfo>, String> {
    let fs = app_handle.fs();
    let entries = fs.read_dir(path).await.map_err(|e| e.to_string())?;
    
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

pub async fn delete_file(app_handle: &AppHandle, path: &str) -> Result<(), String> {
    let fs = app_handle.fs();
    fs.remove_file(path).await.map_err(|e| e.to_string())
}

pub async fn create_directory(app_handle: &AppHandle, path: &str) -> Result<(), String> {
    let fs = app_handle.fs();
    fs.create_dir_all(path).await.map_err(|e| e.to_string())
}

pub async fn copy_file(app_handle: &AppHandle, from: &str, to: &str) -> Result<(), String> {
    let fs = app_handle.fs();
    fs.copy(from, to).await.map_err(|e| e.to_string())
}

pub async fn move_file(app_handle: &AppHandle, from: &str, to: &str) -> Result<(), String> {
    let fs = app_handle.fs();
    fs.rename(from, to).await.map_err(|e| e.to_string())
}

pub async fn file_exists(app_handle: &AppHandle, path: &str) -> Result<bool, String> {
    let fs = app_handle.fs();
    Ok(fs.exists(path).await)
}
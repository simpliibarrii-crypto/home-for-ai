//! Files Commands

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
    pub modified: Option<String>,
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    tokio::fs::read_to_string(path)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|error| error.to_string())?;
    }
    tokio::fs::write(path, content)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<FileInfo>, String> {
    let mut entries = tokio::fs::read_dir(&path)
        .await
        .map_err(|error| error.to_string())?;
    let mut files = Vec::new();

    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|error| error.to_string())?
    {
        let metadata = entry
            .metadata()
            .await
            .map_err(|error| error.to_string())?;
        let modified = metadata.modified().ok().map(|value| {
            DateTime::<Utc>::from(value).to_rfc3339()
        });
        files.push(FileInfo {
            name: entry.file_name().to_string_lossy().into_owned(),
            path: entry.path().to_string_lossy().into_owned(),
            is_dir: metadata.is_dir(),
            size: metadata.is_file().then_some(metadata.len()),
            modified,
        });
    }

    files.sort_by(|left, right| {
        right
            .is_dir
            .cmp(&left.is_dir)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });
    Ok(files)
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    let metadata = tokio::fs::metadata(&path)
        .await
        .map_err(|error| error.to_string())?;
    if metadata.is_dir() {
        tokio::fs::remove_dir_all(path)
            .await
            .map_err(|error| error.to_string())
    } else {
        tokio::fs::remove_file(path)
            .await
            .map_err(|error| error.to_string())
    }
}

#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), String> {
    tokio::fs::create_dir_all(path)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn copy_file(from: String, to: String) -> Result<(), String> {
    tokio::fs::copy(from, to)
        .await
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn move_file(from: String, to: String) -> Result<(), String> {
    tokio::fs::rename(from, to)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn file_exists(path: String) -> Result<bool, String> {
    Ok(tokio::fs::metadata(path).await.is_ok())
}

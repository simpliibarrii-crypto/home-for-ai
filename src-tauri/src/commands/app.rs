//! App Commands

use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub async fn check_updates(app: AppHandle) -> Result<tauri_plugin_updater::Update, String> {
    let updater = app.updater();
    updater.check().await.map_err(|e| e.to_string())?.ok_or_else(|| "No updates available".to_string())
}

#[tauri::command]
pub async fn install_update(app: AppHandle, update: tauri_plugin_updater::Update) -> Result<(), String> {
    update.download_and_install(|_chunk_length, _content_length| {}, || {}).await.map_err(|e| e.to_string())
}
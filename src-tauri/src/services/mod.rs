//! Services module

pub mod chat;
pub mod files;
pub mod python;
pub mod settings;

use tauri::Manager;

pub fn init(app_handle: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    settings::init(app_handle.clone())?;
    chat::init(app_handle.clone())?;
    files::init(app_handle.clone())?;
    python::init(app_handle)?;
    Ok(())
}
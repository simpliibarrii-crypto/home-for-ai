//! Window Commands

use tauri::{AppHandle, Manager};

fn main_window(app: &AppHandle) -> Result<tauri::WebviewWindow, String> {
    app.get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())
}

#[tauri::command]
pub fn show_window(app: AppHandle) -> Result<(), String> {
    let window = main_window(&app)?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn hide_window(app: AppHandle) -> Result<(), String> {
    main_window(&app)?
        .hide()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_window_title(app: AppHandle, title: String) -> Result<(), String> {
    main_window(&app)?
        .set_title(&title)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn minimize_window(app: AppHandle) -> Result<(), String> {
    main_window(&app)?
        .minimize()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn maximize_window(app: AppHandle) -> Result<(), String> {
    main_window(&app)?
        .maximize()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn unmaximize_window(app: AppHandle) -> Result<(), String> {
    main_window(&app)?
        .unmaximize()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn close_window(app: AppHandle) -> Result<(), String> {
    hide_window(app)
}

#[tauri::command]
pub fn toggle_window(app: AppHandle) -> Result<(), String> {
    let window = main_window(&app)?;
    if window.is_visible().map_err(|error| error.to_string())? {
        window.hide().map_err(|error| error.to_string())
    } else {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())
    }
}

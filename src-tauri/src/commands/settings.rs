//! Settings Commands

use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct AppSettings {
    pub theme: String,
    pub language: String,
    pub auto_start: bool,
    pub minimize_to_tray: bool,
    pub close_to_tray: bool,
    pub global_shortcut: String,
    pub backend_url: String,
    pub backend_auto_start: bool,
    pub notifications_enabled: bool,
    pub sound_enabled: bool,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

const SETTINGS_STORE: &str = "settings.json";

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
    let store = app.store(SETTINGS_STORE).map_err(|e| e.to_string())?;
    
    let settings = store.get("settings").cloned().unwrap_or_default();
    let settings: AppSettings = serde_json::from_value(settings).unwrap_or_default();
    
    Ok(settings)
}

#[tauri::command]
pub fn set_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let store = app.store(SETTINGS_STORE).map_err(|e| e.to_string())?;
    
    store.set("settings", serde_json::to_value(&settings).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;
    
    // Apply settings
    apply_settings(&app, &settings)?;
    
    Ok(())
}

fn apply_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    // Apply theme
    if let Some(window) = app.get_webview_window("main") {
        let theme = match settings.theme.as_str() {
            "dark" => tauri::Theme::Dark,
            "light" => tauri::Theme::Light,
            _ => tauri::Theme::System,
        };
        window.set_theme(Some(theme)).map_err(|e| e.to_string())?;
    }
    
    // Apply global shortcut
    #[cfg(desktop)]
    {
        use tauri_plugin_global_shortcut::GlobalShortcutExt;
        app.global_shortcut().unregister_all().map_err(|e| e.to_string())?;
        
        if !settings.global_shortcut.is_empty() {
            app.global_shortcut().register(&settings.global_shortcut, move |app| {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = if window.is_visible().unwrap_or(false) {
                        window.hide()
                    } else {
                        window.show().and_then(|_| window.set_focus())
                    };
                }
            }).map_err(|e| e.to_string())?;
        }
    }
    
    Ok(())
}
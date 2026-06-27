//! Settings Service

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

pub fn init(app_handle: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Load and apply settings on startup
    let store = app_handle.store(SETTINGS_STORE)?;
    
    if let Some(settings_value) = store.get("settings") {
        let settings: AppSettings = serde_json::from_value(settings_value.clone()).unwrap_or_default();
        apply_settings(&app_handle, &settings)?;
    }
    
    Ok(())
}

pub fn get_settings(app_handle: &AppHandle) -> Result<AppSettings, Box<dyn std::error::Error>> {
    let store = app_handle.store(SETTINGS_STORE)?;
    
    let settings = store.get("settings").cloned().unwrap_or_default();
    let settings: AppSettings = serde_json::from_value(settings).unwrap_or_default();
    
    Ok(settings)
}

pub fn set_settings(app_handle: &AppHandle, settings: AppSettings) -> Result<(), Box<dyn std::error::Error>> {
    let store = app_handle.store(SETTINGS_STORE)?;
    
    store.set("settings", serde_json::to_value(&settings)?)?;
    store.save()?;
    
    apply_settings(app_handle, &settings)?;
    
    Ok(())
}

fn apply_settings(app_handle: &AppHandle, settings: &AppSettings) -> Result<(), Box<dyn std::error::Error>> {
    // Apply theme
    if let Some(window) = app_handle.get_webview_window("main") {
        let theme = match settings.theme.as_str() {
            "dark" => tauri::Theme::Dark,
            "light" => tauri::Theme::Light,
            _ => tauri::Theme::System,
        };
        window.set_theme(Some(theme))?;
    }
    
    // Apply global shortcut
    #[cfg(desktop)]
    {
        use tauri_plugin_global_shortcut::GlobalShortcutExt;
        app_handle.global_shortcut().unregister_all()?;
        
        if !settings.global_shortcut.is_empty() {
            let app_handle_clone = app_handle.clone();
            app_handle.global_shortcut().register(&settings.global_shortcut, move || {
                if let Some(window) = app_handle_clone.get_webview_window("main") {
                    let _ = if window.is_visible().unwrap_or(false) {
                        window.hide()
                    } else {
                        window.show().and_then(|_| window.set_focus())
                    };
                }
            })?;
        }
    }
    
    Ok(())
}
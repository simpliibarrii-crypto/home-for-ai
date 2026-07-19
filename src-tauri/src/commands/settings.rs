//! Settings Commands

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
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

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            language: "en".to_string(),
            auto_start: false,
            minimize_to_tray: true,
            close_to_tray: true,
            global_shortcut: String::new(),
            backend_url: "http://127.0.0.1:8000".to_string(),
            backend_auto_start: true,
            notifications_enabled: true,
            sound_enabled: false,
            extra: HashMap::new(),
        }
    }
}

const SETTINGS_STORE: &str = "settings.json";

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
    let store = app.store(SETTINGS_STORE).map_err(|error| error.to_string())?;
    let value = store.get("settings").unwrap_or_default();
    Ok(serde_json::from_value(value).unwrap_or_default())
}

#[tauri::command]
pub fn set_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let store = app.store(SETTINGS_STORE).map_err(|error| error.to_string())?;
    let value = serde_json::to_value(&settings).map_err(|error| error.to_string())?;
    store.set("settings", value);
    store.save().map_err(|error| error.to_string())?;
    apply_settings(&app, &settings)
}

fn apply_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let theme = match settings.theme.as_str() {
            "dark" => Some(tauri::Theme::Dark),
            "light" => Some(tauri::Theme::Light),
            _ => None,
        };
        window.set_theme(theme).map_err(|error| error.to_string())?;
    }

    // The shortcut string is persisted for the interface. Runtime shortcut
    // registration will be reintroduced through the plugin's builder callback
    // once the product has a dedicated shortcut settings flow.
    Ok(())
}

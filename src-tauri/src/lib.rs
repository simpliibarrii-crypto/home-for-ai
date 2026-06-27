//! Tauri App Library

pub mod commands;
pub mod models;
pub mod services;
pub mod utils;

use tauri::{Manager, Runtime};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run<R: Runtime>() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main").map(|window| {
                let _ = window.show();
                let _ = window.set_focus();
            });
        }))
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![
            commands::window::show_window,
            commands::window::hide_window,
            commands::window::toggle_window,
            commands::window::set_window_title,
            commands::window::minimize_window,
            commands::window::maximize_window,
            commands::window::unmaximize_window,
            commands::window::close_window,
            commands::app::get_version,
            commands::app::check_updates,
            commands::app::install_update,
            commands::settings::get_settings,
            commands::settings::set_settings,
            commands::python_sidecar::start_python_backend,
            commands::python_sidecar::stop_python_backend,
            commands::python_sidecar::get_backend_status,
            commands::python_sidecar::restart_python_backend,
            commands::chat::send_message,
            commands::chat::get_conversations,
            commands::chat::create_conversation,
            commands::chat::delete_conversation,
            commands::files::read_file,
            commands::files::write_file,
            commands::files::list_directory,
            commands::files::delete_file,
            commands::files::create_directory,
            commands::files::copy_file,
            commands::files::move_file,
            commands::files::file_exists,
        ])
        .setup(|app| {
            // Initialize logging
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            // Set up global shortcut for toggle window
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::GlobalShortcutExt;
                app.global_shortcut().register("CmdOrCtrl+Shift+A", move |app| {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = if window.is_visible().unwrap_or(false) {
                            window.hide()
                        } else {
                            window.show().and_then(|_| window.set_focus())
                        };
                    }
                }).unwrap();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    // Hide window instead of closing on close request
                    if window.label() == "main" {
                        window.hide().unwrap();
                        api.prevent_close();
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
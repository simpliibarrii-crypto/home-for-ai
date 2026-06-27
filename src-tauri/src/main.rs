//! AI Workplace Desktop Application - Main Entry Point

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use ai_workplace_desktop::commands;
use ai_workplace_desktop::services;
use tauri::Manager;

fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

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
        .plugin(tauri_plugin_updater::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::init())
        .plugin(tauri_plugin_log::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main").map(|window| {
                let _ = window.set_focus();
                let _ = window.unminimize();
                let _ = window.show();
            });
        }))
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            // Initialize services
            services::init(app.handle().clone())?;

            // Setup global shortcut for toggling window
            #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
            {
                let handle = app.handle().clone();
                tauri_plugin_global_shortcut::GlobalShortcutExt::global_shortcut(handle)
                    .register("CommandOrControl+Shift+A", move || {
                        if let Some(window) = handle.get_webview_window("main") {
                            let _ = if window.is_visible().unwrap_or(false) {
                                window.hide()
                            } else {
                                window.show()
                            };
                        }
                    })?;
            }

            // Setup system tray
            #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
            {
                use tauri::{Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem, CustomMenuItem};

                let quit = CustomMenuItem::new("quit".to_string(), "Quit");
                let show = CustomMenuItem::new("show".to_string(), "Show");
                let tray_menu = SystemTrayMenu::new()
                    .add_item(show)
                    .add_native_item(SystemTrayMenuItem::Separator)
                    .add_item(quit);

                let tray = SystemTray::new().with_menu(tray_menu);
                let app_handle = app.handle().clone();

                tauri::SystemTrayBuilder::new().with_menu(tray_menu).on_event(move |event| match event {
                    SystemTrayEvent::MenuItemClick { id, .. } => {
                        match id.as_str() {
                            "show" => {
                                if let Some(window) = app_handle.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                            "quit" => {
                                std::process::exit(0);
                            }
                            _ => {}
                        }
                    }
                    SystemTrayEvent::LeftClick { .. } => {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = if window.is_visible().unwrap_or(false) {
                                window.hide()
                            } else {
                                window.show()
                            };
                        }
                    }
                    _ => {}
                }).build(app)?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::get_system_info,
            commands::system::open_external,
            commands::window::minimize_window,
            commands::window::maximize_window,
            commands::window::close_window,
            commands::window::toggle_window,
            commands::app::get_version,
            commands::app::check_updates,
            commands::app::install_update,
            commands::settings::get_settings,
            commands::settings::set_settings,
            commands::chat::send_message,
            commands::chat::get_conversations,
            commands::chat::create_conversation,
            commands::chat::delete_conversation,
            commands::files::read_file,
            commands::files::write_file,
            commands::files::list_directory,
            commands::files::delete_file,
            commands::files::create_directory,
            commands::python::start_python_backend,
            commands::python::stop_python_backend,
            commands::python::get_backend_status,
            commands::python::send_to_backend,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                api.prevent_exit();
            }
            tauri::RunEvent::WindowEvent { label, event, .. } => {
                if label == "main" {
                    match event {
                        tauri::WindowEvent::CloseRequested { api, .. } => {
                            api.prevent_close();
                            let _ = _app_handle.get_webview_window("main").map(|w| w.hide());
                        }
                        _ => {}
                    }
                }
            }
            _ => {}
        });
}
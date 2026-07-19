//! Tauri App Library

pub mod commands;
pub mod utils;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
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
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}

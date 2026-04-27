mod updater;

use std::sync::Mutex;
use tauri::menu::{MenuBuilder, SubmenuBuilder};
use tauri::{Emitter, Manager};

#[derive(Default)]
struct PendingFiles(Mutex<Vec<String>>);

#[tauri::command]
fn take_pending_files(state: tauri::State<'_, PendingFiles>) -> Vec<String> {
    let mut g = state.0.lock().unwrap();
    std::mem::take(&mut *g)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(PendingFiles::default())
        .invoke_handler(tauri::generate_handler![
            updater::check_for_update,
            take_pending_files
        ])
        .setup(|app| {
            // Minimal macOS menu: App + Edit only.
            // No File / View submenus, so Cmd+O, Cmd+S, Cmd+E, Cmd+D
            // pass through to the webview's keydown listener.
            let app_submenu = SubmenuBuilder::new(app, "mdora")
                .about(None)
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;

            let edit_submenu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&app_submenu)
                .item(&edit_submenu)
                .build()?;

            app.set_menu(menu)?;

            // On Windows / Linux the OS passes the file path as a CLI argument
            // when MDora is launched as the file's handler. Buffer it for the
            // frontend to drain on mount.
            #[cfg(any(windows, target_os = "linux"))]
            {
                let mut files: Vec<String> = Vec::new();
                for arg in std::env::args().skip(1) {
                    if arg.starts_with('-') {
                        continue;
                    }
                    files.push(arg);
                }
                if !files.is_empty() {
                    let state = app.state::<PendingFiles>();
                    state.0.lock().unwrap().extend(files);
                }
            }

            Ok(())
        });

    builder
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(
            #[allow(unused_variables)]
            |app, event| {
                #[cfg(target_os = "macos")]
                if let tauri::RunEvent::Opened { urls } = event {
                    let paths: Vec<String> = urls
                        .into_iter()
                        .filter_map(|u| u.to_file_path().ok())
                        .map(|p| p.to_string_lossy().into_owned())
                        .collect();
                    if paths.is_empty() {
                        return;
                    }
                    let state = app.state::<PendingFiles>();
                    state.0.lock().unwrap().extend(paths.clone());
                    let _ = app.emit("mdora://open-file", paths);
                }
            },
        );
}

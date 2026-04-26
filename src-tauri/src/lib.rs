use std::fs;
use std::path::PathBuf;
use tauri::menu::{MenuBuilder, SubmenuBuilder};

#[tauri::command]
fn read_markdown_file(path: String) -> Result<String, String> {
    let p = PathBuf::from(&path);
    match fs::read_to_string(&p) {
        Ok(contents) => Ok(contents),
        Err(e) => Err(format!("Failed to read {}: {}", path, e)),
    }
}

#[tauri::command]
fn write_markdown_file(path: String, contents: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    fs::write(&p, contents).map_err(|e| format!("Failed to write {}: {}", path, e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![read_markdown_file, write_markdown_file])
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
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

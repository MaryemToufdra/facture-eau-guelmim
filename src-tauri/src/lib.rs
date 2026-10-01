// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;

use commands::{ajouter_client, ajouter_releve, calculer_facture, lister_clients};
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:facture.db",
                    vec![Migration {
                        version: 1,
                        description: "Initial database schema",
                        sql: include_str!("../migrations/001_init.sql"),
                        kind: MigrationKind::Up,
                    }],
                )
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            ajouter_client,
            lister_clients,
            ajouter_releve,
            calculer_facture
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

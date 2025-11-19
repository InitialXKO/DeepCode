#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

// Define a command to read the config file
#[tauri::command]
fn read_config(app_handle: tauri::AppHandle) -> Result<String, String> {
    let resource_path = app_handle.path_resolver()
        .resolve_resource("../../mcp_agent.config.yaml")
        .or_else(|| {
             // Fallback: try to find it relative to the executable or current working directory
             // When running in dev mode, it might be in the project root
             let mut path = std::env::current_dir().unwrap_or_default();
             // If we are in src-tauri, go up two levels
             if path.ends_with("src-tauri") {
                 path.pop();
                 path.pop();
             }
             // If we are in desktop-ui, go up one level
             else if path.ends_with("desktop-ui") {
                 path.pop();
             }
             path.push("mcp_agent.config.yaml");
             if path.exists() {
                 Some(path)
             } else {
                 None
             }
        })
        .ok_or("Config file not found")?;

    fs::read_to_string(resource_path).map_err(|e| e.to_string())
}

// Define a command to write the config file
#[tauri::command]
fn write_config(app_handle: tauri::AppHandle, content: String) -> Result<(), String> {
    let resource_path = app_handle.path_resolver()
        .resolve_resource("../../mcp_agent.config.yaml")
        .or_else(|| {
             let mut path = std::env::current_dir().unwrap_or_default();
             if path.ends_with("src-tauri") {
                 path.pop();
                 path.pop();
             }
             else if path.ends_with("desktop-ui") {
                 path.pop();
             }
             path.push("mcp_agent.config.yaml");
             Some(path)
        })
        .ok_or("Config file path could not be resolved")?;

    fs::write(resource_path, content).map_err(|e| e.to_string())
}

// Define a command to read the secrets file
#[tauri::command]
fn read_secrets(app_handle: tauri::AppHandle) -> Result<String, String> {
    let resource_path = app_handle.path_resolver()
        .resolve_resource("../../mcp_agent.secrets.yaml")
        .or_else(|| {
             let mut path = std::env::current_dir().unwrap_or_default();
             if path.ends_with("src-tauri") {
                 path.pop();
                 path.pop();
             }
             else if path.ends_with("desktop-ui") {
                 path.pop();
             }
             path.push("mcp_agent.secrets.yaml");
             if path.exists() {
                 Some(path)
             } else {
                 None
             }
        })
        .ok_or("Secrets file not found")?;

    fs::read_to_string(resource_path).map_err(|e| e.to_string())
}

// Define a command to write the secrets file
#[tauri::command]
fn write_secrets(app_handle: tauri::AppHandle, content: String) -> Result<(), String> {
    let resource_path = app_handle.path_resolver()
        .resolve_resource("../../mcp_agent.secrets.yaml")
        .or_else(|| {
             let mut path = std::env::current_dir().unwrap_or_default();
             if path.ends_with("src-tauri") {
                 path.pop();
                 path.pop();
             }
             else if path.ends_with("desktop-ui") {
                 path.pop();
             }
             path.push("mcp_agent.secrets.yaml");
             Some(path)
        })
        .ok_or("Secrets file path could not be resolved")?;

    fs::write(resource_path, content).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            read_config,
            write_config,
            read_secrets,
            write_secrets
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

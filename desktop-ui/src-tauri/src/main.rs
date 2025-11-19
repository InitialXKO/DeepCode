#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use tauri::Manager;
use serde::{Deserialize, Serialize};
use reqwest::Client;

// --- Data Structures ---

#[derive(Debug, Serialize, Deserialize)]
struct Question {
    id: String,
    text: String,
    category: String,
    hint: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProcessingHistoryEntry {
    id: String,
    timestamp: String,
    status: String,
    input_type: String,
    input_source: Option<String>,
    result: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SystemDiagnostics {
    python_version: String,
    platform: String,
    modules: std::collections::HashMap<String, bool>,
    event_loop_status: String,
}

// --- Helper Functions ---

async fn make_post_request<T: Serialize, R: for<'de> Deserialize<'de>>(endpoint: &str, body: &T) -> Result<R, String> {
    let client = Client::new();
    let url = format!("http://localhost:8000{}", endpoint);

    let response = client.post(&url)
        .json(body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API Error: {}", response.status()));
    }

    response.json::<R>()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))
}

async fn make_get_request<R: for<'de> Deserialize<'de>>(endpoint: &str) -> Result<R, String> {
    let client = Client::new();
    let url = format!("http://localhost:8000{}", endpoint);

    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API Error: {}", response.status()));
    }

    response.json::<R>()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))
}

// --- Tauri Commands ---

#[tauri::command]
async fn generate_questions(initial_requirement: String) -> Result<Vec<Question>, String> {
    #[derive(Serialize)]
    struct Request { initial_requirement: String }

    make_post_request("/generate_questions", &Request { initial_requirement }).await
}

#[tauri::command]
async fn generate_detailed_requirements(initial_requirement: String, answers: std::collections::HashMap<String, String>) -> Result<String, String> {
    #[derive(Serialize)]
    struct Request { initial_requirement: String, answers: std::collections::HashMap<String, String> }

    make_post_request("/generate_requirements", &Request { initial_requirement, answers }).await
}

#[tauri::command]
async fn edit_requirements(current_requirements: String, feedback: String) -> Result<String, String> {
    #[derive(Serialize)]
    struct Request { current_requirements: String, feedback: String }

    make_post_request("/edit_requirements", &Request { current_requirements, feedback }).await
}

#[tauri::command]
async fn get_processing_history() -> Result<Vec<ProcessingHistoryEntry>, String> {
    make_get_request("/processing_history").await
}

#[tauri::command]
async fn clear_processing_history() -> Result<(), String> {
    let client = Client::new();
    let url = "http://localhost:8000/processing_history";

    let response = client.delete(url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API Error: {}", response.status()));
    }

    Ok(())
}

#[tauri::command]
async fn get_system_diagnostics() -> Result<SystemDiagnostics, String> {
    make_get_request("/system_diagnostics").await
}

#[tauri::command]
async fn reset_application_state() -> Result<(), String> {
    let client = Client::new();
    let url = "http://localhost:8000/reset_state";

    let response = client.post(url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API Error: {}", response.status()));
    }

    Ok(())
}

// --- Existing Config Commands ---

#[tauri::command]
fn read_config(app_handle: tauri::AppHandle) -> Result<String, String> {
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
             if path.exists() {
                 Some(path)
             } else {
                 None
             }
        })
        .ok_or("Config file not found")?;

    fs::read_to_string(resource_path).map_err(|e| e.to_string())
}

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
            write_secrets,
            generate_questions,
            generate_detailed_requirements,
            edit_requirements,
            get_processing_history,
            clear_processing_history,
            get_system_diagnostics,
            reset_application_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

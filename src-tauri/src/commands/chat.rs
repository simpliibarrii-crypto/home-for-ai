//! Chat Commands

use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub message_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SendMessageRequest {
    pub conversation_id: Option<String>,
    pub content: String,
    pub model: Option<String>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SendMessageResponse {
    pub conversation_id: String,
    pub message_id: String,
    pub content: String,
}

#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    request: SendMessageRequest,
) -> Result<SendMessageResponse, String> {
    // Get backend URL from settings
    let settings_store = app.store("settings.json").map_err(|e| e.to_string())?;
    let settings_value = settings_store.get("settings").cloned().unwrap_or_default();
    let settings: crate::commands::settings::AppSettings = serde_json::from_value(settings_value).unwrap_or_default();
    
    let backend_url = settings.backend_url.trim_end_matches('/');
    
    // Create or get conversation
    let conversation_id = request.conversation_id.unwrap_or_else(|| Uuid::new_v4().to_string());
    
    // Call Python backend
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/chat/completions", backend_url))
        .json(&serde_json::json!({
            "conversation_id": conversation_id,
            "message": request.content,
            "model": request.model,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let response_json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    
    Ok(SendMessageResponse {
        conversation_id: response_json["conversation_id"].as_str().unwrap_or(&conversation_id).to_string(),
        message_id: Uuid::new_v4().to_string(),
        content: response_json["response"].as_str().unwrap_or("").to_string(),
    })
}

#[tauri::command]
pub async fn get_conversations(app: AppHandle) -> Result<Vec<Conversation>, String> {
    let settings_store = app.store("settings.json").map_err(|e| e.to_string())?;
    let settings_value = settings_store.get("settings").cloned().unwrap_or_default();
    let settings: crate::commands::settings::AppSettings = serde_json::from_value(settings_value).unwrap_or_default();
    
    let backend_url = settings.backend_url.trim_end_matches('/');
    
    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/api/conversations", backend_url))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let conversations: Vec<Conversation> = response.json().await.map_err(|e| e.to_string())?;
    
    Ok(conversations)
}

#[tauri::command]
pub async fn create_conversation(app: AppHandle, title: String) -> Result<Conversation, String> {
    let settings_store = app.store("settings.json").map_err(|e| e.to_string())?;
    let settings_value = settings_store.get("settings").cloned().unwrap_or_default();
    let settings: crate::commands::settings::AppSettings = serde_json::from_value(settings_value).unwrap_or_default();
    
    let backend_url = settings.backend_url.trim_end_matches('/');
    
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/conversations", backend_url))
        .json(&serde_json::json!({ "title": title }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let conversation: Conversation = response.json().await.map_err(|e| e.to_string())?;
    
    Ok(conversation)
}

#[tauri::command]
pub async fn delete_conversation(app: AppHandle, conversation_id: String) -> Result<(), String> {
    let settings_store = app.store("settings.json").map_err(|e| e.to_string())?;
    let settings_value = settings_store.get("settings").cloned().unwrap_or_default();
    let settings: crate::commands::settings::AppSettings = serde_json::from_value(settings_value).unwrap_or_default();
    
    let backend_url = settings.backend_url.trim_end_matches('/');
    
    let client = reqwest::Client::new();
    client
        .delete(format!("{}/api/conversations/{}", backend_url, conversation_id))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(())
}
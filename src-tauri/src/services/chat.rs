//! Chat Service

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

pub fn init(app_handle: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Initialize chat service
    Ok(())
}

pub async fn get_backend_url(app_handle: &AppHandle) -> String {
    let settings_store = app_handle.store("settings.json").unwrap();
    let settings_value = settings_store.get("settings").cloned().unwrap_or_default();
    let settings: crate::services::settings::AppSettings = serde_json::from_value(settings_value).unwrap_or_default();
    settings.backend_url.trim_end_matches('/').to_string()
}

pub async fn send_message(
    app_handle: &AppHandle,
    conversation_id: Option<String>,
    content: String,
    model: Option<String>,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
) -> Result<serde_json::Value, String> {
    let backend_url = get_backend_url(app_handle).await;
    
    let client = reqwest::Client::new();
    let conversation_id = conversation_id.unwrap_or_else(|| Uuid::new_v4().to_string());
    
    let response = client
        .post(format!("{}/api/chat/completions", backend_url))
        .json(&serde_json::json!({
            "conversation_id": conversation_id,
            "message": content,
            "model": model,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let response_json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    
    Ok(response_json)
}

pub async fn get_conversations(app_handle: &AppHandle) -> Result<Vec<Conversation>, String> {
    let backend_url = get_backend_url(app_handle).await;
    
    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/api/conversations", backend_url))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let conversations: Vec<Conversation> = response.json().await.map_err(|e| e.to_string())?;
    
    Ok(conversations)
}

pub async fn create_conversation(app_handle: &AppHandle, title: String) -> Result<Conversation, String> {
    let backend_url = get_backend_url(app_handle).await;
    
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

pub async fn delete_conversation(app_handle: &AppHandle, conversation_id: String) -> Result<(), String> {
    let backend_url = get_backend_url(app_handle).await;
    
    let client = reqwest::Client::new();
    client
        .delete(format!("{}/api/conversations/{}", backend_url, conversation_id))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(())
}
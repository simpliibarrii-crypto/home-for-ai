//! Chat Commands

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
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

fn backend_url(app: &AppHandle) -> Result<String, String> {
    let store = app
        .store("settings.json")
        .map_err(|error| error.to_string())?;
    let value = store.get("settings").unwrap_or_default();
    let settings: crate::commands::settings::AppSettings =
        serde_json::from_value(value).unwrap_or_default();
    Ok(settings.backend_url.trim_end_matches('/').to_string())
}

#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    request: SendMessageRequest,
) -> Result<SendMessageResponse, String> {
    let backend_url = backend_url(&app)?;
    let conversation_id = request
        .conversation_id
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    let response = reqwest::Client::new()
        .post(format!("{backend_url}/api/chat/completions"))
        .json(&serde_json::json!({
            "conversation_id": conversation_id,
            "message": request.content,
            "model": request.model,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        }))
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?;

    let response_json: serde_json::Value = response
        .json()
        .await
        .map_err(|error| error.to_string())?;

    Ok(SendMessageResponse {
        conversation_id: response_json["conversation_id"]
            .as_str()
            .unwrap_or(&conversation_id)
            .to_string(),
        message_id: Uuid::new_v4().to_string(),
        content: response_json["response"]
            .as_str()
            .unwrap_or("")
            .to_string(),
    })
}

#[tauri::command]
pub async fn get_conversations(app: AppHandle) -> Result<Vec<Conversation>, String> {
    reqwest::Client::new()
        .get(format!("{}/api/conversations", backend_url(&app)?))
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .json()
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn create_conversation(
    app: AppHandle,
    title: String,
) -> Result<Conversation, String> {
    reqwest::Client::new()
        .post(format!("{}/api/conversations", backend_url(&app)?))
        .json(&serde_json::json!({ "title": title }))
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .json()
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn delete_conversation(
    app: AppHandle,
    conversation_id: String,
) -> Result<(), String> {
    reqwest::Client::new()
        .delete(format!(
            "{}/api/conversations/{conversation_id}",
            backend_url(&app)?
        ))
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?;
    Ok(())
}

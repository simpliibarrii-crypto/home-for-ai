"""
Home for AI — Chat API Routes

POST /chat                      → Single chat message to an agent (REST)
WS   /ws/chat/{agent_id}        → Streaming WebSocket chat with an agent

The WebSocket endpoint sends back streamed tokens as they arrive from
the LLM, then emits a final "chat:message" event on completion.
"""

from __future__ import annotations

import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel

from agents.agent_registry import get_agent_by_id
from api.websocket_manager import get_websocket_manager
from security.auth import get_current_user, get_optional_user
from security.input_validator import sanitize_chat_message, validate_agent_id
from security.rate_limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    agent_id: str
    message: str
    user_id: str | None = None


class ChatResponse(BaseModel):
    agent_id: str
    response: str
    agent_name: str
    agent_emoji: str


# ---------------------------------------------------------------------------
# REST endpoint
# ---------------------------------------------------------------------------

@router.post("", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat_with_agent(
    request: Request,
    body: ChatRequest,
    user_id: str = Depends(get_current_user),
) -> ChatResponse:
    """
    Send a single message to an agent and receive a response.

    Rate limited to 30 messages/minute per user.
    """
    safe_agent_id = validate_agent_id(body.agent_id)
    safe_message = sanitize_chat_message(body.message)

    agent = get_agent_by_id(safe_agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.")

    response = await agent.chat(user_message=safe_message, user_id=user_id)

    # Broadcast to WebSocket clients listening
    ws_manager = get_websocket_manager()
    await ws_manager.broadcast_to_agent_subscribers(
        agent_id=safe_agent_id,
        event="chat:message",
        payload={
            "agent_id": safe_agent_id,
            "user_id": user_id,
            "message": response,
            "user_message": safe_message,
        },
    )

    return ChatResponse(
        agent_id=safe_agent_id,
        response=response,
        agent_name=agent.identity.name,
        agent_emoji=agent.identity.emoji,
    )


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@router.websocket("/ws/{agent_id}")
async def websocket_chat(
    websocket: WebSocket,
    agent_id: str,
) -> None:
    """
    WebSocket chat endpoint for real-time agent conversation.

    Protocol (client → server):
        { "message": "What's your outlook on BTC?" }

    Protocol (server → client):
        { "event": "chat:message", "payload": { "response": "...", "agent_id": "...", ... } }
        { "event": "chat:done",    "payload": {} }
        { "event": "error",        "payload": { "detail": "..." } }
    """
    try:
        safe_agent_id = validate_agent_id(agent_id)
    except HTTPException as e:
        await websocket.close(code=4004, reason=e.detail)
        return

    agent = get_agent_by_id(safe_agent_id)
    if not agent:
        await websocket.close(code=4004, reason="Agent not found")
        return

    ws_manager = get_websocket_manager()
    client_id = f"chat-{safe_agent_id}-{secrets.token_hex(4)}"
    info = await ws_manager.connect(websocket, client_id, user_id=None)
    ws_manager.subscribe_to_agent(client_id, safe_agent_id)

    try:
        while True:
            raw = await websocket.receive_text()

            import json
            try:
                data = json.loads(raw)
            except ValueError:
                await info.send("error", {"detail": "Invalid JSON"})
                continue

            user_message = data.get("message", "").strip()
            if not user_message:
                await info.send("error", {"detail": "Empty message"})
                continue

            try:
                safe_message = sanitize_chat_message(user_message)
            except HTTPException as e:
                await info.send("error", {"detail": e.detail})
                continue

            # Generate response
            response = await agent.chat(user_message=safe_message, user_id=client_id)

            await info.send("chat:message", {
                "agent_id": safe_agent_id,
                "agent_name": agent.identity.name,
                "agent_emoji": agent.identity.emoji,
                "response": response,
                "user_message": safe_message,
            })
            await info.send("chat:done", {})

    except WebSocketDisconnect:
        logger.info("Chat WebSocket disconnected: %s", client_id)
    except Exception as exc:
        logger.exception("Chat WebSocket error: %s", exc)
    finally:
        ws_manager.disconnect(client_id)

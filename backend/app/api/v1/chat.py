"""API routes for AI chatbot endpoint."""

from typing import Any, Dict, List

import httpx
from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.logger import get_logger
from app.schemas import ChatHealthResponse, ChatRequest, ChatResponse
from app.services.llm import generate_chat_reply

logger = get_logger(__name__)

router = APIRouter(tags=["chat"])


def _extract_model_names(payload: Dict[str, Any]) -> List[str]:
    models = payload.get("models")
    if not isinstance(models, list):
        return []

    names: List[str] = []
    for item in models:
        if isinstance(item, dict):
            name = item.get("name")
            if isinstance(name, str) and name.strip():
                names.append(name.strip())
    return names


async def _get_chat_provider_health() -> Dict[str, Any]:
    provider = settings.llm_provider.strip().lower()
    base_url = settings.ollama_base_url
    model = settings.ollama_model

    if provider != "ollama":
        return {
            "provider": provider,
            "base_url": base_url,
            "model": model,
            "provider_reachable": False,
            "model_available": False,
        }

    endpoint = f"{base_url.rstrip('/')}/api/tags"
    timeout = httpx.Timeout(5.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(endpoint)
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError):
        return {
            "provider": provider,
            "base_url": base_url,
            "model": model,
            "provider_reachable": False,
            "model_available": False,
        }

    names = _extract_model_names(payload)
    return {
        "provider": provider,
        "base_url": base_url,
        "model": model,
        "provider_reachable": True,
        "model_available": model in names,
    }


@router.get(
    "/chat/health",
    response_model=ChatHealthResponse,
    responses={
        500: {"description": "Internal server error"},
    },
)
async def chat_health() -> ChatHealthResponse:
    """Return chatbot provider/model readiness details."""
    health = await _get_chat_provider_health()
    return ChatHealthResponse(**health)


@router.post(
    "/chat",
    response_model=ChatResponse,
    responses={
        400: {"description": "Invalid chat request"},
        503: {"description": "LLM provider unavailable"},
        500: {"description": "Internal server error"},
    },
)
async def chat(request: ChatRequest) -> ChatResponse:
    """Generate a chatbot response from the configured LLM provider."""
    try:
        logger.info("Chat message received")
        reply = await generate_chat_reply(request.message, request.context)
        return ChatResponse(reply=reply)
    except RuntimeError as exc:
        logger.warning("Chat provider unavailable: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.error("Unexpected chat error: %s", str(exc), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate response. Please try again.",
        ) from exc

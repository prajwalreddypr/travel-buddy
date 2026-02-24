"""LLM service for chatbot responses."""

from typing import Dict, Optional, Any

import httpx

from app.core.config import settings
from app.logger import get_logger

logger = get_logger(__name__)


def _fallback_reply(context: Optional[Dict[str, str]] = None) -> str:
    destination = ""
    days = ""

    if context:
        destination = str(context.get("destination", "")).strip()
        days = str(context.get("days", "")).strip()

    if destination and days:
        return (
            f"I'm having trouble reaching the AI model right now. For a {days}-day trip to {destination}, "
            "focus on 2-3 key areas, pre-book major attractions, and keep one flexible half-day for rest or weather changes. "
            "Please try your question again in a moment."
        )

    if destination:
        return (
            f"I'm having trouble reaching the AI model right now. For {destination}, plan a simple day-by-day itinerary, "
            "book transport early, and check weather and local transit passes before departure. "
            "Please try your question again in a moment."
        )

    return (
        "I'm having trouble reaching the AI model right now. As a quick tip, set a destination budget, "
        "book major transport/accommodation first, and keep a small buffer for local travel and food. "
        "Please try again in a moment."
    )


def _build_user_content(message: str, context: Optional[Dict[str, str]] = None) -> str:
    if not context:
        return message

    safe_context = {k: v for k, v in context.items() if isinstance(v, str) and v.strip()}
    if not safe_context:
        return message

    lines = ["User trip context:"]
    for key, value in safe_context.items():
        lines.append(f"- {key}: {value}")
    lines.append("")
    lines.append(f"User question: {message}")
    return "\n".join(lines)


def _extract_ollama_reply(payload: Dict[str, Any]) -> str:
    message = payload.get("message")
    if isinstance(message, dict):
        content = message.get("content")
        if isinstance(content, str):
            return content.strip()
    return ""


async def generate_chat_reply(message: str, context: Optional[Dict[str, str]] = None) -> str:
    """Generate chatbot reply from configured LLM provider."""
    provider = settings.llm_provider.strip().lower()
    user_content = _build_user_content(message, context)

    if provider != "ollama":
        logger.warning(
            "Unsupported LLM provider '%s'. Falling back to ollama.",
            settings.llm_provider,
        )

    endpoint = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
    body = {
        "model": settings.ollama_model,
        "messages": [
            {"role": "system", "content": settings.llm_system_prompt},
            {"role": "user", "content": user_content},
        ],
        "stream": False,
        "options": {
            "num_predict": settings.llm_max_tokens,
            "temperature": 0.3,
        },
    }

    timeout = httpx.Timeout(settings.llm_timeout_seconds)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(endpoint, json=body)
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPError as exc:
        logger.warning("Ollama request failed, using fallback reply: %s", str(exc), exc_info=True)
        return _fallback_reply(context)

    reply = _extract_ollama_reply(payload)
    if not reply:
        logger.warning("Ollama response missing content, using fallback reply: %s", payload)
        return _fallback_reply(context)

    return reply

"""LLM service for chatbot responses."""

import asyncio
from time import perf_counter
from typing import Dict, Optional, Any
from uuid import uuid4

import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.logger import get_logger

logger = get_logger(__name__)

_llm_semaphore: Optional[asyncio.Semaphore] = None

_DEFAULT_CONTEXT_KEY_WHITELIST = {
    "origin",
    "destination",
    "start_date",
    "end_date",
    "days",
    "travelers",
    "transport_type",
    "budget",
    "food_total",
    "misc_total",
}


class OllamaMessage(BaseModel):
    content: str


class OllamaChatResponse(BaseModel):
    message: OllamaMessage


def _get_llm_semaphore() -> asyncio.Semaphore:
    global _llm_semaphore
    if _llm_semaphore is None:
        max_concurrency = max(1, int(getattr(settings, "llm_max_concurrent_requests", 2)))
        _llm_semaphore = asyncio.Semaphore(max_concurrency)
    return _llm_semaphore


def _is_retryable_http_status(status_code: int) -> bool:
    return 500 <= status_code < 600


def _compute_backoff_seconds(attempt: int, base_seconds: float = 0.25) -> float:
    return base_seconds * (2 ** max(attempt - 1, 0))


def _truncate_text(value: str, max_chars: int) -> str:
    if max_chars <= 0:
        return ""
    return value[:max_chars]


def _sanitize_message(message: str) -> str:
    max_chars = max(1, int(getattr(settings, "llm_max_message_chars", 2000)))
    return _truncate_text(message.strip(), max_chars)


def _sanitize_context(context: Optional[Dict[str, str]]) -> Optional[Dict[str, str]]:
    if not context:
        return None

    max_items = max(1, int(getattr(settings, "llm_max_context_items", 12)))
    max_value_chars = max(1, int(getattr(settings, "llm_max_context_value_chars", 256)))
    allowed_keys = set(getattr(settings, "llm_context_allowed_keys", _DEFAULT_CONTEXT_KEY_WHITELIST))

    sanitized: Dict[str, str] = {}
    for key, value in context.items():
        if len(sanitized) >= max_items:
            break
        if key not in allowed_keys:
            continue
        if not isinstance(value, str):
            continue
        text = value.strip()
        if not text:
            continue
        sanitized[key] = _truncate_text(text, max_value_chars)

    return sanitized or None


async def _request_ollama_chat(endpoint: str, body: Dict[str, Any], timeout: httpx.Timeout) -> Dict[str, Any]:
    retry_attempts = max(1, int(getattr(settings, "llm_retry_attempts", 2)))
    last_exception: Optional[Exception] = None

    for attempt in range(1, retry_attempts + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(endpoint, json=body)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code if exc.response is not None else 0
            if 400 <= status_code < 500:
                logger.error(
                    "Ollama returned non-retriable client error (status=%s): %s",
                    status_code,
                    str(exc),
                    exc_info=True,
                )
                raise RuntimeError(
                    f"LLM provider rejected the request (status={status_code})."
                ) from exc

            last_exception = exc
            if attempt < retry_attempts and _is_retryable_http_status(status_code):
                backoff = _compute_backoff_seconds(attempt)
                logger.warning(
                    "Ollama server error (status=%s), retrying attempt %s/%s in %.2fs",
                    status_code,
                    attempt,
                    retry_attempts,
                    backoff,
                )
                await asyncio.sleep(backoff)
                continue
            raise
        except (httpx.TimeoutException, httpx.ConnectError, httpx.RequestError) as exc:
            last_exception = exc
            if attempt < retry_attempts:
                backoff = _compute_backoff_seconds(attempt)
                logger.warning(
                    "Ollama transient transport error, retrying attempt %s/%s in %.2fs: %s",
                    attempt,
                    retry_attempts,
                    backoff,
                    str(exc),
                )
                await asyncio.sleep(backoff)
                continue
            raise
        except ValueError as exc:
            raise ValueError("Failed to parse Ollama JSON response") from exc

    if last_exception:
        raise last_exception
    raise RuntimeError("Ollama request failed without a specific exception")


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
    try:
        parsed = OllamaChatResponse.model_validate(payload)
    except ValidationError:
        return ""
    return parsed.message.content.strip()


async def _generate_ollama_reply(request_id: str, message: str, context: Optional[Dict[str, str]] = None) -> str:
    started_at = perf_counter()
    provider = "ollama"
    user_content = _build_user_content(message, context)
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
        payload = await _request_ollama_chat(endpoint, body, timeout)
    except httpx.TimeoutException as exc:
        elapsed_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.warning(
            "Ollama timeout, using fallback reply",
            extra={
                "request_id": request_id,
                "provider": provider,
                "model": settings.ollama_model,
                "error_code": "LLM_TIMEOUT",
                "elapsed_ms": elapsed_ms,
                "error": str(exc),
            },
            exc_info=True,
        )
        return _fallback_reply(context)
    except httpx.ConnectError as exc:
        elapsed_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.warning(
            "Ollama connection error, using fallback reply",
            extra={
                "request_id": request_id,
                "provider": provider,
                "model": settings.ollama_model,
                "error_code": "LLM_CONNECT_ERROR",
                "elapsed_ms": elapsed_ms,
                "error": str(exc),
            },
            exc_info=True,
        )
        return _fallback_reply(context)
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code if exc.response is not None else 0
        elapsed_ms = round((perf_counter() - started_at) * 1000, 2)
        if 400 <= status_code < 500:
            logger.error(
                "Ollama returned non-retriable client error",
                extra={
                    "request_id": request_id,
                    "provider": provider,
                    "model": settings.ollama_model,
                    "status_code": status_code,
                    "error_code": "LLM_CLIENT_ERROR",
                    "elapsed_ms": elapsed_ms,
                    "error": str(exc),
                },
                exc_info=True,
            )
            raise RuntimeError(
                f"LLM provider rejected the request (status={status_code})."
            ) from exc

        logger.warning(
            "Ollama server error, using fallback reply",
            extra={
                "request_id": request_id,
                "provider": provider,
                "model": settings.ollama_model,
                "status_code": status_code,
                "error_code": "LLM_SERVER_ERROR",
                "elapsed_ms": elapsed_ms,
                "error": str(exc),
            },
            exc_info=True,
        )
        return _fallback_reply(context)
    except httpx.RequestError as exc:
        elapsed_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.warning(
            "Ollama transport error, using fallback reply",
            extra={
                "request_id": request_id,
                "provider": provider,
                "model": settings.ollama_model,
                "error_code": "LLM_TRANSPORT_ERROR",
                "elapsed_ms": elapsed_ms,
                "error": str(exc),
            },
            exc_info=True,
        )
        return _fallback_reply(context)
    except ValueError as exc:
        elapsed_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.warning(
            "Ollama response parse error, using fallback reply",
            extra={
                "request_id": request_id,
                "provider": provider,
                "model": settings.ollama_model,
                "error_code": "LLM_RESPONSE_PARSE_ERROR",
                "elapsed_ms": elapsed_ms,
                "error": str(exc),
            },
            exc_info=True,
        )
        return _fallback_reply(context)

    reply = _extract_ollama_reply(payload)
    if not reply:
        elapsed_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.warning(
            "Ollama response missing content, using fallback reply",
            extra={
                "request_id": request_id,
                "provider": provider,
                "model": settings.ollama_model,
                "error_code": "LLM_EMPTY_RESPONSE",
                "elapsed_ms": elapsed_ms,
            },
        )
        return _fallback_reply(context)

    elapsed_ms = round((perf_counter() - started_at) * 1000, 2)
    logger.info(
        "LLM response generated",
        extra={
            "request_id": request_id,
            "provider": provider,
            "model": settings.ollama_model,
            "elapsed_ms": elapsed_ms,
        },
    )

    return reply


def _get_provider_registry() -> Dict[str, Any]:
    return {
        "ollama": _generate_ollama_reply,
    }


async def generate_chat_reply(message: str, context: Optional[Dict[str, str]] = None) -> str:
    """Generate chatbot reply from configured LLM provider."""
    request_id = str(uuid4())
    started_at = perf_counter()
    provider = settings.llm_provider.strip().lower()
    safe_message = _sanitize_message(message)
    safe_context = _sanitize_context(context)

    provider_registry = _get_provider_registry()
    provider_handler = provider_registry.get(provider)

    if provider_handler is None:
        elapsed_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.error(
            "Unsupported LLM provider configured",
            extra={
                "request_id": request_id,
                "provider": settings.llm_provider,
                "error_code": "LLM_UNSUPPORTED_PROVIDER",
                "elapsed_ms": elapsed_ms,
            },
        )
        supported_providers = ", ".join(sorted(provider_registry.keys()))
        raise RuntimeError(
            f"Unsupported LLM provider '{settings.llm_provider}'. Supported providers: {supported_providers}."
        )

    semaphore = _get_llm_semaphore()
    queue_timeout = max(1, int(getattr(settings, "llm_queue_wait_timeout_seconds", 20)))

    try:
        await asyncio.wait_for(semaphore.acquire(), timeout=queue_timeout)
    except TimeoutError as exc:
        logger.warning(
            "LLM queue wait timeout",
            extra={
                "request_id": request_id,
                "provider": provider,
                "error_code": "LLM_QUEUE_TIMEOUT",
                "queue_timeout_seconds": queue_timeout,
            },
        )
        raise RuntimeError("LLM service is busy. Please retry in a few seconds.") from exc

    try:
        return await provider_handler(request_id=request_id, message=safe_message, context=safe_context)
    finally:
        semaphore.release()

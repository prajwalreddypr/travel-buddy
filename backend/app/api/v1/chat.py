"""API routes for AI chatbot endpoint."""

import json
from typing import Any, Dict, List

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth.security import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.logger import get_logger
from app.models import SavedTrip, User
from app.schemas import ChatFromTripRequest, ChatFromTripResponse, ChatHealthResponse, ChatRequest, ChatResponse
from app.services.llm import generate_chat_reply

logger = get_logger(__name__)

router = APIRouter(tags=["chat"])


def _build_trip_context(trip: SavedTrip) -> Dict[str, str]:
    trip_days = (trip.end_date - trip.start_date).days + 1
    context: Dict[str, str] = {
        "origin": trip.origin,
        "destination": trip.destination,
        "start_date": trip.start_date.isoformat(),
        "end_date": trip.end_date.isoformat(),
        "days": str(max(trip_days, 1)),
        "travelers": str(trip.travelers),
        "transport_type": trip.transport_type,
        "budget": f"{trip.total:.2f}",
    }

    try:
        breakdown = json.loads(trip.breakdown_json)
        if isinstance(breakdown, dict):
            context["food_total"] = str(breakdown.get("food", ""))
            context["misc_total"] = str(breakdown.get("misc", ""))
    except (TypeError, ValueError):
        logger.warning("Could not parse trip breakdown_json for trip_id=%s", trip.id)

    return context


def _build_trip_action_message(request: ChatFromTripRequest, context: Dict[str, str]) -> str:
    destination = context.get("destination", "this destination")
    days = context.get("days", "")
    budget = context.get("budget", "")
    transport_type = context.get("transport_type", "any")

    if request.question:
        return request.question

    if request.action == "improve_itinerary":
        return (
            f"Improve my itinerary for {destination} in {days} day(s). "
            "Give a day-wise plan with morning, afternoon, and evening suggestions."
        )

    if request.action == "reduce_budget_15":
        target_budget_text = ""
        try:
            target_budget = round(float(budget) * 0.85, 2)
            target_budget_text = f"Target total budget: {target_budget}. "
        except (TypeError, ValueError):
            target_budget_text = ""
        return (
            f"Reduce this trip budget by 15% while keeping good experience quality. {target_budget_text}"
            f"Current preferred transport: {transport_type}."
        )

    if request.action == "family_friendly":
        return (
            f"Create a family-friendly version of this {days}-day {destination} trip. "
            "Include kid-friendly attractions, rest breaks, and practical transport advice."
        )

    return (
        f"Using this saved-trip context for {destination} ({days} day(s)), "
        "give practical recommendations for planning and execution."
    )


def _get_user_trip_or_404(session: Session, current_user: User, trip_id: int) -> SavedTrip:
    trip = session.exec(
        select(SavedTrip)
        .where(SavedTrip.id == trip_id)
        .where(SavedTrip.user_id == current_user.id)
    ).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


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


@router.post(
    "/chat/from-trip/{trip_id}",
    response_model=ChatFromTripResponse,
    responses={
        401: {"description": "Unauthorized"},
        404: {"description": "Trip not found"},
        500: {"description": "Internal server error"},
    },
)
async def chat_from_saved_trip(
    trip_id: int,
    request: ChatFromTripRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ChatFromTripResponse:
    """Generate chat response using trusted context from an authenticated user's saved trip."""
    try:
        trip = _get_user_trip_or_404(session, current_user, trip_id)
        context = _build_trip_context(trip)
        message = _build_trip_action_message(request, context)
        reply = await generate_chat_reply(message, context)
        return ChatFromTripResponse(
            trip_id=trip.id,
            action=request.action,
            reply=reply,
            context=context,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Unexpected chat-from-trip error: %s", str(exc), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate trip-based response. Please try again.",
        ) from exc

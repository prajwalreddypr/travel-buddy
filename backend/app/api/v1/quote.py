from fastapi import APIRouter, Depends, HTTPException
from app.schemas import TripRequest, QuoteResponse, Breakdown, TransportOption
from app.services.pricing import estimate_trip

router = APIRouter()


@router.post("/quote", response_model=QuoteResponse)
async def create_quote(request: TripRequest):
    if request.end_date < request.start_date:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date")

    result = await estimate_trip(request)

    breakdown = Breakdown(
        transport=[TransportOption(**opt.dict()) if hasattr(opt, "dict") else TransportOption(**opt) for opt in result["transport_options"]],
        accommodation=result["accommodation"],
        food=result["food"],
        misc=result["misc"],
        total=result["total"],
    )

    return QuoteResponse(trip_days=result["trip_days"], breakdown=breakdown)

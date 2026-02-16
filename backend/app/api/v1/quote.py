"""API routes for trip quote endpoint."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.schemas import TripRequest, QuoteResponse, Breakdown
from app.services.pricing import estimate_trip
from app.db.session import get_session
from app.exceptions import TravelBuddyException, create_http_exception
from app.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["quotes"])


@router.post(
    "/quote",
    response_model=QuoteResponse,
    responses={
        400: {"description": "Invalid trip request"},
        500: {"description": "Internal server error"},
    },
)
async def create_quote(
    request: TripRequest,
    session: Session = Depends(get_session),
) -> QuoteResponse:
    """
    Create a trip quote with cost breakdown.
    
    ### Request Body
    - **origin**: Origin city (required)
    - **destination**: Destination city (required)
    - **start_date**: Trip start date in YYYY-MM-DD format (must be today or future)
    - **end_date**: Trip end date in YYYY-MM-DD format (must be >= start_date)
    - **travelers**: Number of travelers (1-20, default: 1)
    - **transport_type**: Preferred transport type (optional, default: "any")
    
    ### Response
    Returns a quote with:
    - **trip_days**: Number of days for the trip
    - **breakdown**: Cost breakdown including transport, accommodation, food, misc, and total
    
    ### Errors
    - 400: Invalid trip request (bad dates, bad cities, etc.)
    - 500: Internal server error
    """
    try:
        logger.info(
            f"Creating quote: {request.origin} -> {request.destination}, "
            f"{request.start_date} to {request.end_date}, {request.travelers} travelers"
        )
        
        # Estimate trip costs
        result = await estimate_trip(request, session)
        
        # Build response
        breakdown = Breakdown(
            transport=result["transport_options"],
            accommodation=result["accommodation"],
            food=result["food"],
            misc=result["misc"],
            total=result["total"],
        )
        
        response = QuoteResponse(trip_days=result["trip_days"], breakdown=breakdown)
        logger.info(f"Quote created successfully: ${response.breakdown.total}")
        return response
        
    except TravelBuddyException as e:
        logger.warning(f"Validation error creating quote: {e.message}")
        raise create_http_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error creating quote: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create quote. Please try again later.",
        )

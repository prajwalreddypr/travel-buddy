"""API routes for saved trips."""

import json
from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlmodel import Session, select

from app.auth.security import get_current_user
from app.db.session import get_session
from app.models import SavedTrip, User
from app.schemas import SavedTripCreate, SavedTripResponse, Breakdown

router = APIRouter(tags=["trips"])


@router.post("/trips", response_model=SavedTripResponse, status_code=status.HTTP_201_CREATED)
def save_trip(
    payload: SavedTripCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> SavedTripResponse:
    breakdown_json = json.dumps(payload.breakdown.model_dump())
    saved = SavedTrip(
        user_id=current_user.id,
        origin=payload.origin,
        destination=payload.destination,
        start_date=payload.start_date,
        end_date=payload.end_date,
        travelers=payload.travelers,
        transport_type=payload.transport_type or "any",
        breakdown_json=breakdown_json,
        total=payload.breakdown.total,
    )
    session.add(saved)
    session.commit()
    session.refresh(saved)

    breakdown = Breakdown.model_validate(json.loads(saved.breakdown_json))
    return SavedTripResponse(
        id=saved.id,
        created_at=saved.created_at,
        origin=saved.origin,
        destination=saved.destination,
        start_date=saved.start_date,
        end_date=saved.end_date,
        travelers=saved.travelers,
        transport_type=saved.transport_type,
        breakdown=breakdown,
        total=saved.total,
    )


@router.get("/trips", response_model=List[SavedTripResponse])
def list_trips(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> List[SavedTripResponse]:
    trips = session.exec(select(SavedTrip).where(SavedTrip.user_id == current_user.id).order_by(SavedTrip.created_at.desc())).all()
    response: list[SavedTripResponse] = []
    for trip in trips:
        breakdown = Breakdown.model_validate(json.loads(trip.breakdown_json))
        response.append(
            SavedTripResponse(
                id=trip.id,
                created_at=trip.created_at,
                origin=trip.origin,
                destination=trip.destination,
                start_date=trip.start_date,
                end_date=trip.end_date,
                travelers=trip.travelers,
                transport_type=trip.transport_type,
                breakdown=breakdown,
                total=trip.total,
            )
        )
    return response


@router.get("/trips/{trip_id}", response_model=SavedTripResponse)
def get_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> SavedTripResponse:
    trip = session.exec(
        select(SavedTrip).where(SavedTrip.id == trip_id).where(SavedTrip.user_id == current_user.id)
    ).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    breakdown = Breakdown.model_validate(json.loads(trip.breakdown_json))
    return SavedTripResponse(
        id=trip.id,
        created_at=trip.created_at,
        origin=trip.origin,
        destination=trip.destination,
        start_date=trip.start_date,
        end_date=trip.end_date,
        travelers=trip.travelers,
        transport_type=trip.transport_type,
        breakdown=breakdown,
        total=trip.total,
    )


@router.put("/trips/{trip_id}", response_model=SavedTripResponse)
def update_trip(
    trip_id: int,
    payload: SavedTripCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> SavedTripResponse:
    trip = session.exec(
        select(SavedTrip).where(SavedTrip.id == trip_id).where(SavedTrip.user_id == current_user.id)
    ).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    trip.origin = payload.origin
    trip.destination = payload.destination
    trip.start_date = payload.start_date
    trip.end_date = payload.end_date
    trip.travelers = payload.travelers
    trip.transport_type = payload.transport_type or "any"
    trip.breakdown_json = json.dumps(payload.breakdown.model_dump())
    trip.total = payload.breakdown.total
    
    session.add(trip)
    session.commit()
    session.refresh(trip)
    
    breakdown = Breakdown.model_validate(json.loads(trip.breakdown_json))
    return SavedTripResponse(
        id=trip.id,
        created_at=trip.created_at,
        origin=trip.origin,
        destination=trip.destination,
        start_date=trip.start_date,
        end_date=trip.end_date,
        travelers=trip.travelers,
        transport_type=trip.transport_type,
        breakdown=breakdown,
        total=trip.total,
    )

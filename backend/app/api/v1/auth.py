"""API routes for authentication."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from app.auth.security import create_access_token, get_current_user, hash_password, verify_password
from app.core.config import settings
from app.db.session import get_session
from app.models import User
from app.schemas import UserCreate, UserLogin, UserResponse

router = APIRouter(tags=["auth"])


def validate_password_length(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")
    if len(password) > 72:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be 72 characters or less")


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        max_age=settings.jwt_access_token_exp_minutes * 60,
        path="/",
    )


@router.post("/auth/register", response_model=UserResponse)
def register_user(
    payload: UserCreate,
    response: Response,
    session: Session = Depends(get_session),
) -> UserResponse:
    validate_password_length(payload.password)
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    try:
        hashed_password = hash_password(payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    user = User(email=payload.email, hashed_password=hashed_password)
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(subject=user.email)
    set_auth_cookie(response, token)

    return UserResponse(id=user.id, email=user.email)


@router.post("/auth/login", response_model=UserResponse)
def login_user(
    payload: UserLogin,
    response: Response,
    session: Session = Depends(get_session),
) -> UserResponse:
    validate_password_length(payload.password)
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(subject=user.email)
    set_auth_cookie(response, token)

    return UserResponse(id=user.id, email=user.email)


@router.post("/auth/logout")
def logout_user(response: Response) -> dict:
    response.delete_cookie(key=settings.auth_cookie_name, path="/")
    return {"message": "Logged out"}


@router.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=current_user.id, email=current_user.email)

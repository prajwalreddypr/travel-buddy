"""Travel Buddy API - Main application entry point."""

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import time

from app.api.v1 import quote as quote_router
from app.api.v1 import auth as auth_router
from app.api.v1 import trips as trips_router
from app.api.v1 import chat as chat_router
from app.db.session import init_db
from app import seed
from app.core.config import settings
from app.core.rate_limit import InMemoryRateLimiter, RateLimiter, create_rate_limiter
from app.schemas import HealthResponse
from app.logger import get_logger

logger = get_logger(__name__)

try:
    rate_limiter: RateLimiter = create_rate_limiter(
        backend=settings.api_rate_limit_backend,
        max_requests=settings.api_rate_limit_requests,
        window_seconds=settings.api_rate_limit_window_seconds,
        redis_url=settings.redis_url,
        redis_key_prefix=settings.redis_rate_limit_prefix,
        redis_connect_timeout_seconds=settings.redis_connect_timeout_seconds,
        redis_socket_timeout_seconds=settings.redis_socket_timeout_seconds,
    )
except Exception as exc:
    logger.warning(
        "Failed to initialize configured rate limiter backend '%s': %s. Falling back to in-memory limiter.",
        settings.api_rate_limit_backend,
        str(exc),
    )
    rate_limiter = InMemoryRateLimiter(
        max_requests=settings.api_rate_limit_requests,
        window_seconds=settings.api_rate_limit_window_seconds,
    )

# Initialize FastAPI app
app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    description="Travel cost estimation API",
)

logger.info(f"Starting Travel Buddy API v{settings.app_version} in {settings.app_environment} mode")


# ===== MIDDLEWARE =====

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_credentials,
    allow_methods=settings.cors_methods,
    allow_headers=settings.cors_headers,
)


# Request/Response logging middleware
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    """Log incoming requests and outgoing responses."""
    start_time = time.time()
    
    # Log incoming request
    logger.info(f"REQ {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
    except Exception as e:
        logger.error(f"Request failed: {str(e)}", exc_info=True)
        raise
    
    # Log response with timing
    process_time = time.time() - start_time
    logger.info(
        f"RES {response.status_code} {request.method} {request.url.path} "
        f"(took {process_time:.3f}s)"
    )
    
    return response


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Apply configurable rate limiting to protected API paths."""
    if not settings.api_rate_limit_enabled:
        return await call_next(request)

    path = request.url.path
    if not any(path.startswith(prefix) for prefix in settings.api_rate_limit_paths):
        return await call_next(request)

    client_host = request.client.host if request.client else "unknown"
    key = f"{client_host}:{path}"
    try:
        allowed, _count, retry_after = await rate_limiter.allow(key)
    except Exception as exc:
        logger.warning("Rate limiter check failed; allowing request: %s", str(exc), exc_info=True)
        return await call_next(request)

    if not allowed:
        retry_after_seconds = max(1, int(retry_after))
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Please retry shortly."},
            headers={"Retry-After": str(retry_after_seconds)},
        )

    return await call_next(request)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    
    # Prevent framing attacks
    response.headers["X-Frame-Options"] = "DENY"
    
    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Enable XSS protection
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Content Security Policy (strict)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "  # Allow inline for simple frontend
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self'"
    )
    
    # Prevent referrer leaking
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    return response


# ===== STARTUP & SHUTDOWN EVENTS =====

@app.on_event("startup")
def on_startup():
    """Initialize database and seed data on startup."""
    logger.info("Application startup...")
    try:
        init_db()
        seed.seed_city_stats()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Startup error: {str(e)}", exc_info=True)
        raise


@app.on_event("shutdown")
async def on_shutdown():
    """Cleanup on shutdown."""
    try:
        await rate_limiter.close()
    except Exception as exc:
        logger.warning("Rate limiter shutdown cleanup failed: %s", str(exc))
    logger.info("Application shutting down...")


# ===== HEALTH CHECK ENDPOINT =====

@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["health"],
    description="Check API health status",
)
def health_check() -> HealthResponse:
    """
    Health check endpoint.
    
    Returns:
        - **status**: "healthy" if all systems operational
        - **version**: Current API version
        - **environment**: Current deployment environment
    """
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        environment=settings.app_environment,
    )


# ===== FRONTEND SERVING =====

frontend_root = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
)
static_dir = os.path.join(frontend_root, "static")

# Mount static files
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/", tags=["frontend"])
def index():
    """Serve the frontend index.html."""
    index_path = os.path.join(frontend_root, "index.html")
    if not os.path.exists(index_path):
        logger.warning(f"Frontend index.html not found at {index_path}")
        return JSONResponse(
            status_code=404,
            content={"detail": "Frontend not found"},
        )
    return FileResponse(index_path)


@app.get("/login", tags=["frontend"])
def login_page():
    """Serve the frontend login.html."""
    login_path = os.path.join(frontend_root, "login.html")
    if not os.path.exists(login_path):
        logger.warning(f"Frontend login.html not found at {login_path}")
        return JSONResponse(
            status_code=404,
            content={"detail": "Login page not found"},
        )
    return FileResponse(login_path)


@app.get("/trips", tags=["frontend"])
def trips_page():
    """Serve the frontend trips.html."""
    trips_path = os.path.join(frontend_root, "trips.html")
    if not os.path.exists(trips_path):
        logger.warning(f"Frontend trips.html not found at {trips_path}")
        return JSONResponse(
            status_code=404,
            content={"detail": "Trips page not found"},
        )
    return FileResponse(trips_path)


@app.get("/profile", tags=["frontend"])
def profile_page():
    """Serve the frontend profile.html."""
    profile_path = os.path.join(frontend_root, "profile.html")
    if not os.path.exists(profile_path):
        logger.warning(f"Frontend profile.html not found at {profile_path}")
        return JSONResponse(
            status_code=404,
            content={"detail": "Profile page not found"},
        )
    return FileResponse(profile_path)


@app.get("/edit-trip", tags=["frontend"])
def edit_trip_page():
    """Serve the frontend edit-trip.html."""
    edit_trip_path = os.path.join(frontend_root, "edit-trip.html")
    if not os.path.exists(edit_trip_path):
        logger.warning(f"Frontend edit-trip.html not found at {edit_trip_path}")
        return JSONResponse(
            status_code=404,
            content={"detail": "Edit trip page not found"},
        )
    return FileResponse(edit_trip_path)


# ===== API ROUTES =====

app.include_router(
    quote_router.router,
    prefix="/api/v1",
    responses={
        400: {"description": "Bad request"},
        500: {"description": "Internal server error"},
    },
)

app.include_router(
    auth_router.router,
    prefix="/api/v1",
    responses={
        401: {"description": "Unauthorized"},
        400: {"description": "Bad request"},
    },
)

app.include_router(
    trips_router.router,
    prefix="/api/v1",
    responses={
        401: {"description": "Unauthorized"},
        400: {"description": "Bad request"},
    },
)

app.include_router(
    chat_router.router,
    prefix="/api/v1",
    responses={
        400: {"description": "Bad request"},
        503: {"description": "LLM provider unavailable"},
    },
)


# ===== ERROR HANDLERS =====

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.is_development(),
        log_level=settings.log_level.lower(),
    )

"""Travel Buddy API - Main application entry point."""

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import time

from app.api.v1 import quote as quote_router
from app.db.session import init_db
from app import seed
from app.core.config import settings
from app.schemas import HealthResponse
from app.logger import get_logger

logger = get_logger(__name__)

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
    logger.info(f"→ {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
    except Exception as e:
        logger.error(f"Request failed: {str(e)}", exc_info=True)
        raise
    
    # Log response with timing
    process_time = time.time() - start_time
    logger.info(
        f"← {response.status_code} {request.method} {request.url.path} "
        f"(took {process_time:.3f}s)"
    )
    
    return response


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
def on_shutdown():
    """Cleanup on shutdown."""
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


# ===== API ROUTES =====

app.include_router(
    quote_router.router,
    prefix="/api/v1",
    responses={
        400: {"description": "Bad request"},
        500: {"description": "Internal server error"},
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

import os
from dotenv import load_dotenv

load_dotenv()


def _parse_csv_env(value: str, default: list[str]) -> list[str]:
    if not value:
        return default
    parsed = [item.strip() for item in value.split(",") if item.strip()]
    return parsed or default


class Settings:
    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./travel.db")
    db_pool_size: int = int(os.getenv("DB_POOL_SIZE", "5"))
    db_max_overflow: int = int(os.getenv("DB_MAX_OVERFLOW", "10"))
    db_pool_timeout: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    db_pool_recycle: int = int(os.getenv("DB_POOL_RECYCLE", "1800"))
    
    # Server
    app_host: str = os.getenv("APP_HOST", "0.0.0.0")
    app_port: int = int(os.getenv("APP_PORT", "8000"))
    app_title: str = "Travel Buddy API"
    app_version: str = "1.0.0"
    app_environment: str = os.getenv("APP_ENVIRONMENT", "development")
    
    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "info")
    log_file: str = os.getenv("LOG_FILE", "")  # Empty = no file logging
    
    # CORS
    cors_origins: list = ["http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:3000", "http://127.0.0.1:8080"]
    cors_credentials: bool = True
    cors_methods: list = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    cors_headers: list = ["*"]
    
    # API Limits
    max_travelers: int = int(os.getenv("MAX_TRAVELERS", "20"))
    max_trip_days: int = int(os.getenv("MAX_TRIP_DAYS", "365"))
    min_trip_days: int = 1
    api_rate_limit_enabled: bool = os.getenv("API_RATE_LIMIT_ENABLED", "true").lower() in ("1", "true", "yes")
    api_rate_limit_requests: int = int(os.getenv("API_RATE_LIMIT_REQUESTS", "120"))
    api_rate_limit_window_seconds: int = int(os.getenv("API_RATE_LIMIT_WINDOW_SECONDS", "60"))
    api_rate_limit_paths: list = _parse_csv_env(
        os.getenv("API_RATE_LIMIT_PATHS", ""),
        ["/api/v1/chat", "/api/v1/chat/from-trip"],
    )
    
    # Defaults for pricing (if city not found in DB)
    default_accommodation_per_night: float = 100.0
    default_food_per_day: float = 35.0
    default_misc_per_day: float = 20.0
    
    # Payment/Transport provider timeout
    provider_timeout_seconds: int = int(os.getenv("PROVIDER_TIMEOUT", "10"))

    # Auth / JWT
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change-me")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_access_token_exp_minutes: int = int(os.getenv("JWT_ACCESS_TOKEN_EXP_MINUTES", "60"))
    auth_cookie_name: str = os.getenv("AUTH_COOKIE_NAME", "travel_buddy_token")
    auth_cookie_secure: bool = os.getenv("AUTH_COOKIE_SECURE", "false").lower() in ("1", "true", "yes")
    auth_cookie_samesite: str = os.getenv("AUTH_COOKIE_SAMESITE", "lax")

    # LLM / Chatbot
    llm_provider: str = os.getenv("LLM_PROVIDER", "ollama")
    llm_timeout_seconds: int = int(os.getenv("LLM_TIMEOUT_SECONDS", "30"))
    llm_max_tokens: int = int(os.getenv("LLM_MAX_TOKENS", "220"))
    llm_retry_attempts: int = int(os.getenv("LLM_RETRY_ATTEMPTS", "2"))
    llm_max_concurrent_requests: int = int(os.getenv("LLM_MAX_CONCURRENT_REQUESTS", "2"))
    llm_queue_wait_timeout_seconds: int = int(os.getenv("LLM_QUEUE_WAIT_TIMEOUT_SECONDS", "20"))
    llm_max_message_chars: int = int(os.getenv("LLM_MAX_MESSAGE_CHARS", "2000"))
    llm_max_context_items: int = int(os.getenv("LLM_MAX_CONTEXT_ITEMS", "12"))
    llm_max_context_value_chars: int = int(os.getenv("LLM_MAX_CONTEXT_VALUE_CHARS", "256"))
    llm_context_allowed_keys: list = _parse_csv_env(
        os.getenv("LLM_CONTEXT_ALLOWED_KEYS", ""),
        [
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
        ],
    )
    llm_system_prompt: str = os.getenv(
        "LLM_SYSTEM_PROMPT",
        (
            "You are Travel Buddy AI, a concise travel planning assistant. "
            "Help users with destinations, budgeting, itineraries, seasons, transport, visas, and trip tips. "
            "If information is uncertain, say so briefly and suggest checking official sources. "
            "Format answers in a clean structure: short intro, then numbered recommendations and brief actionable tips. "
            "When a user asks for an N-day itinerary, provide all days from Day 1 through Day N with clear headings and do not omit later days. "
            "Keep answers easy to scan."
        ),
    )

    # Ollama (local)
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
    
    def is_development(self) -> bool:
        return self.app_environment.lower() in ("development", "dev")
    
    def is_production(self) -> bool:
        return self.app_environment.lower() == "production"


settings = Settings()

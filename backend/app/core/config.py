import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./travel.db")
    
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

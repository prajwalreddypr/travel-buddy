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
    
    def is_development(self) -> bool:
        return self.app_environment.lower() in ("development", "dev")
    
    def is_production(self) -> bool:
        return self.app_environment.lower() == "production"


settings = Settings()

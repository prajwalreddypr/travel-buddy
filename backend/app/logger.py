"""Logging configuration for Travel Buddy API."""

import logging
import logging.handlers
from app.core.config import settings
import os


def get_logger(name: str) -> logging.Logger:
    """Get a configured logger instance."""
    logger = logging.getLogger(name)
    
    # Only configure if not already configured
    if logger.handlers:
        return logger
    
    # Set log level based on environment
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logger.setLevel(log_level)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    
    # Format: timestamp | level | logger_name | message
    formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler (if configured)
    if settings.log_file:
        log_dir = os.path.dirname(settings.log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
        
        file_handler = logging.handlers.RotatingFileHandler(
            settings.log_file,
            maxBytes=10485760,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


# Convenience functions
logger = get_logger("travel_buddy")


def log_request(method: str, path: str, query_params: dict = None):
    """Log an incoming request."""
    query_str = f"?{dict(query_params)}" if query_params else ""
    logger.info(f"Request: {method} {path}{query_str}")


def log_response(status_code: int, method: str, path: str):
    """Log an outgoing response."""
    logger.info(f"Response: {status_code} {method} {path}")


def log_error(error: Exception, context: str = ""):
    """Log an error with context."""
    context_str = f" | {context}" if context else ""
    logger.error(f"Error{context_str}: {str(error)}", exc_info=True)

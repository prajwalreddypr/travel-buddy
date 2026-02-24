# Travel Buddy — Backend (FastAPI)

A robust travel cost estimation API built with FastAPI, featuring comprehensive error handling, input validation, database integration, and extensive test coverage.

## Quick Start

### 1. Setup Virtual Environment

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

The backend uses environment variables for configuration. Create a `.env` file in the backend directory:

```bash
# Copy the example
cp .env.example .env

# Or for production
cp .env.prod .env
```

**Key environment variables:**
- `APP_ENVIRONMENT`: `development` or `production`
- `DATABASE_URL`: SQLite (default) or PostgreSQL for production
- `LOG_LEVEL`: `info`, `debug`, `warning`
- `MAX_TRAVELERS`: Maximum travelers per trip (default: 20)
- `MAX_TRIP_DAYS`: Maximum trip duration in days (default: 365)
- `LLM_PROVIDER`: `ollama` for local chatbot responses
- `OLLAMA_BASE_URL`: Ollama API URL (default: `http://localhost:11434`)
- `OLLAMA_MODEL`: Local model name (default: `llama3.1:8b`)
- `LLM_TIMEOUT_SECONDS`: Request timeout for chat responses (default: 30)

### 3. Run the Application

```bash
# Development (with auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or
python -m app.main
```

The API will be available at `http://localhost:8000`

### 4. Chatbot Model Setup (Ollama)

Before using `/api/v1/chat`, ensure Ollama is running and the configured model is pulled:

```bash
ollama pull qwen2.5:3b
ollama list
```

Optional readiness check:

```bash
curl http://localhost:8000/api/v1/chat/health
```

## API Documentation

### Interactive API Docs
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Endpoints

#### Health Check
```
GET /health
```
Health status and version information.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "development"
}
```

#### Get Trip Quote
```
POST /api/v1/quote
```

**Request:**
```json
{
  "origin": "New York",
  "destination": "Paris",
  "start_date": "2026-03-15",
  "end_date": "2026-03-25",
  "travelers": 2,
  "transport_type": "any"
}
```

#### AI Chat
```
POST /api/v1/chat
```

#### AI Chat Health
```
GET /api/v1/chat/health
```

**Response:**
```json
{
  "provider": "ollama",
  "base_url": "http://localhost:11434",
  "model": "qwen2.5:3b",
  "provider_reachable": true,
  "model_available": true
}
```

**Request:**
```json
{
  "message": "Is 5 days enough for Tokyo?",
  "context": {
    "destination": "Tokyo",
    "days": "5"
  }
}
```

**Response:**
```json
{
  "reply": "Five days is a solid first trip for Tokyo..."
}
```

**Validation Rules:**
- `origin` and `destination`: Required, non-empty, different from each other
- `start_date`: Must be today or in the future
- `end_date`: Must be after or equal to `start_date`
- `travelers`: 1-20 (configurable via `MAX_TRAVELERS`)
- Trip duration: Cannot exceed `MAX_TRIP_DAYS` (default: 365 days)

**Response:**
```json
{
  "trip_days": 10,
  "breakdown": {
    "transport": [
      {
        "provider": "Global Airways",
        "transport_type": "flight",
        "price": 450.00,
        "currency": "USD",
        "notes": "Direct flight"
      },
      {
        "provider": "Express Railways",
        "transport_type": "train",
        "price": 270.00,
        "currency": "USD",
        "notes": "Scenic route"
      }
    ],
    "accommodation": {
      "per_night": 120.00,
      "nights": 10,
      "total": 1200.00
    },
    "food": 400.00,
    "misc": 200.00,
    "total": 2520.00
  }
}
```

## Architecture

### Project Structure

```
backend/
├── app/
│   ├── api/v1/
│   │   └── quote.py           # Quote endpoint
│   ├── core/
│   │   └── config.py          # Configuration management
│   ├── db/
│   │   └── session.py         # Database session management
│   ├── providers/
│   │   ├── base.py            # Base provider interface
│   │   └── mock_provider.py   # Mock transport provider
│   ├── services/
│   │   └── pricing.py         # Trip cost estimation logic
│   ├── exceptions.py          # Custom exception classes
│   ├── logger.py              # Logging configuration
│   ├── models.py              # SQLModel database models
│   ├── schemas.py             # Pydantic request/response schemas
│   ├── seed.py                # Database seeding
│   └── main.py                # Application entry point
├── tests/
│   ├── conftest.py            # Pytest fixtures
│   └── test_quote.py          # Comprehensive test suite (25+ tests)
├── .env                       # Environment variables (development)
├── .env.example               # Environment template
├── .env.prod                  # Production template
├── requirements.txt           # Python dependencies
└── README.md                  # This file
```

## Features

### Error Handling
- Custom exception classes with appropriate HTTP status codes
- Global exception handler for unhandled exceptions
- Detailed error messages for validation failures
- Request/response logging for debugging

### Input Validation
- Comprehensive Pydantic validators
- Date validation (must be future, end >= start)
- City name validation (non-empty, different)
- Traveler count validation (1-20)
- Trip duration limits
- Type hints throughout codebase

### Database
- SQLModel ORM for type-safe queries
- Dependency injection for database sessions
- SQLite for development, PostgreSQL-ready for production
- Connection pooling and health checks
- Automatic table creation on startup

### Transport Providers
- Abstract base class for provider implementations
- Mock provider returns multiple transport options (flight, train, bus)
- Extensible architecture for real provider integration

### Dependency Injection
- FastAPI `Depends()` for database sessions
- Easy testing with dependency overrides
- Clean separation of concerns

### Logging
- Structured logging throughout application
- Configurable log levels (development/production)
- File and console output
- Request/response logging
- Error tracking with stack traces

### Security
- CORS middleware (configurable origins)
- Security headers (X-Frame-Options, CSP, etc.)
- Input validation and sanitization
- Safe async/await patterns

### Configuration
- Environment-based configuration
- Separate configs for dev/production
- Dotenv support
- Default values for all settings

### Testing
- 25+ comprehensive test cases
- Happy path, edge cases, error scenarios
- Database mocking with in-memory SQLite
- Async test support
- Provider unit tests

## Running Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_quote.py

# Generate coverage report
pytest --cov=app tests/
```

## Development Workflow

### Database Migrations
Tables are automatically created on startup via `init_db()`.

### Adding a New Endpoint
1. Create schema in `app/schemas.py` with Pydantic validators
2. Create router in `app/api/v1/` 
3. Include router in `app/main.py`
4. Add tests in `tests/`

### Implementing a Real Provider
1. Create `app/providers/real_provider.py` extending `BaseProvider`
2. Implement `get_prices()` method
3. Update `app/services/pricing.py` 
4. Add tests

## Frontend

A simple frontend is available in the sibling `frontend/` folder. The backend serves it at `/` and static assets at `/static/`.
- To modify the frontend, edit `frontend/index.html` and files in `frontend/static/`.

## Production Deployment

1. Update environment: `cp .env.prod .env`
2. Use PostgreSQL: `DATABASE_URL=postgresql://...`
3. Set production: `APP_ENVIRONMENT=production`
4. Run with Gunicorn

## What is Included

✓ FastAPI app with `/api/v1/quote` and `/health` endpoints
✓ SQLite dev DB with automatic migrations
✓ Multiple transport options per query
✓ Custom exception handling with proper HTTP codes
✓ Request/response validation with Pydantic
✓ Structured logging system
✓ Security headers and CORS
✓ Dependency injection for testability
✓ 25+ comprehensive test cases
✓ Type hints throughout
✓ Environment-based configuration
✓ Frontend static file serving

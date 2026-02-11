# Travel Buddy

Backend-first Travel cost estimator (FastAPI + SQLModel) with a minimal static frontend.

Small MVP that estimates transport + accommodation + per-day costs using a mock provider. Useful as a starter backend for integrating real providers later.

## Quick start (development)

Requirements: Python 3.11+ (recommended), Windows PowerShell (examples below use PowerShell).

1. Create and activate a virtual environment:

```powershell
python -m venv .venv
& ".venv/Scripts/Activate.ps1"
```

2. Install backend dependencies and run tests:

```powershell
cd backend
pip install -r requirements.txt
$env:PYTHONPATH='.'; pytest -q
```

3. Run the backend server (no reload recommended for single-process runs):

```powershell
cd backend
$env:PYTHONPATH='.'; uvicorn app.main:app --host 127.0.0.1 --port 8000
```

4. Open the UI in your browser: http://127.0.0.1:8000

The frontend is a static single-page app mounted by FastAPI from the `frontend/` folder.

## Project layout

- `backend/` — FastAPI app, models, services, and tests
- `frontend/` — static UI (`index.html`, `static/app.js`, `static/styles.css`)
- `.venv/` — optional local virtualenv (not committed)

## API

- POST `/api/v1/quote` — accept trip parameters and return a cost breakdown (see `backend/app/schemas.py`). Use the UI or curl/Invoke-RestMethod to test.

Example request body:

```json
{
  "origin": "Berlin",
  "destination": "Paris",
  "start_date": "2026-03-15",
  "end_date": "2026-03-18",
  "travelers": 1
}
```

## Tests

Run tests from the `backend` folder:

```powershell
cd backend
$env:PYTHONPATH='.'; pytest -q
```

## Notes & next steps

- The pricing provider is a `MockProvider` live in `backend/app/providers/` — replace or extend with real APIs (flights, trains, hotels).
- Consider adding Alembic for migrations, CI (GitHub Actions), and Docker Compose for reproducible dev containers.

## License

This repo is provided as-is. Add a license file if you plan to publish.

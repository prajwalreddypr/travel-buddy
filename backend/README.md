# Travel Buddy — Backend (FastAPI)

Quickstart

1. Create a virtualenv and install deps:

```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

2. Run the app:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3. POST to `/api/v1/quote` to get a quote (see tests for example payload).

Frontend

- A simple frontend is available in the sibling `frontend/` folder. The backend serves it at `/` and static assets at `/static/`.
- To modify the frontend, edit `frontend/index.html` and files in `frontend/static/`.

What is included
- FastAPI app with a `POST /api/v1/quote` endpoint
- SQLite dev DB via `sqlmodel` and simple seeding
- Provider abstraction and a deterministic mock provider
- Pricing service computing transport, accommodation, food, misc
- Tests with `pytest`

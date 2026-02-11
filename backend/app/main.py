from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.v1 import quote as quote_router
from app.db.session import init_db, engine
from app import seed
import os


app = FastAPI(title="Travel Buddy API")


@app.on_event("startup")
def on_startup():
    init_db()
    seed.seed_city_stats()


# Serve frontend from sibling `frontend/` folder (keeps backend separate)
frontend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend'))
static_dir = os.path.join(frontend_root, 'static')
app.mount('/static', StaticFiles(directory=static_dir), name='static')


@app.get('/')
def index():
    return FileResponse(os.path.join(frontend_root, 'index.html'))


app.include_router(quote_router.router, prefix="/api/v1")

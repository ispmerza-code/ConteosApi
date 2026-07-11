import logging
import sys
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.routers import auth, catalogo, conteos

logging.basicConfig(level=settings.LOG_LEVEL.upper())

app = FastAPI(
    title="API Conteos SCISP",
    description="API para el sistema de conteos de productos en sucursales",
    version="1.0.0",
)

_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
_allow_credentials = "*" not in _origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(conteos.router, prefix="/api/v1/conteos", tags=["Conteos"])
app.include_router(catalogo.router)


@app.get("/")
async def root():
    return {"message": "API Conteos SCISP - Sistema de conteos de productos"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/health/db")
async def health_db():
    from app.core.database import get_session_factory

    try:
        db = get_session_factory()()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "error", "db": str(e)}

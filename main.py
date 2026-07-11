import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import conteos, auth, catalogo
from app.core.config import settings
from app.core.database import get_engine
from app.models import models

logging.basicConfig(level=settings.LOG_LEVEL.upper())

# Nota: evitar inicializar o ejecutar migraciones automáticamente cuando
# el código se ejecuta en el entorno serverless de Vercel. Vercel exporta la
# variable de entorno `VERCEL=1` en su runtime. Solo ejecutar creación/migración
# cuando no estemos en Vercel (p. ej. en desarrollo local o deployment manual).
if not os.getenv("VERCEL"):
    # Crear las tablas si no existen (no bloquear el arranque si la DB no está disponible)
    try:
        models.Base.metadata.create_all(bind=get_engine())
    except Exception as e:
        print(f"[WARNING] No se pudieron crear las tablas: {e}")

    # Migración: agregar columna FechaHora si no existe
    try:
        from sqlalchemy import text
        with get_engine().connect() as _conn:
            _res = _conn.execute(text(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conteo' AND COLUMN_NAME = 'FechaHora'"
            ))
            if _res.scalar() == 0:
                _conn.execute(text("ALTER TABLE conteo ADD COLUMN FechaHora DATETIME NULL"))
                _conn.commit()
                print("[INFO] Columna FechaHora agregada a la tabla conteo")
    except Exception as _e:
        print(f"[WARNING] No se pudo ejecutar migración FechaHora: {_e}")

app = FastAPI(
    title="API Conteos SCISP",
    description="API para el sistema de conteos de productos en sucursales",
    version="1.0.0"
)

# Configurar CORS
_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
_allow_credentials = "*" not in _origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
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
        db.execute(__import__('sqlalchemy').text("SELECT 1"))
        db.close()
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "error", "db": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

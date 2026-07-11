"""Verifica variables de entorno y conexión a Aiven MySQL."""

from __future__ import annotations

import os
import sys
from urllib.parse import urlparse

REQUIRED_VARS = [
    "DATABASE_URL",
    "SECRET_KEY",
]

OPTIONAL_VARS = [
    "DB_SSL_VERIFY",
    "ALLOWED_ORIGINS",
    "ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "LOG_LEVEL",
]


def load_dotenv() -> None:
    try:
        from dotenv import load_dotenv as _load
        _load()
    except ImportError:
        pass


def mask_url(url: str) -> str:
    parsed = urlparse(url)
    user = parsed.username or "?"
    host = parsed.hostname or "?"
    port = parsed.port or "?"
    db = (parsed.path or "/").lstrip("/") or "?"
    return f"mysql+pymysql://{user}:****@{host}:{port}/{db}"


def check_env_vars() -> list[str]:
    errors: list[str] = []
    for var in REQUIRED_VARS:
        value = os.getenv(var, "").strip()
        if not value:
            errors.append(f"Falta {var}")
        elif var == "SECRET_KEY" and len(value) < 32:
            errors.append("SECRET_KEY debe tener al menos 32 caracteres")
        elif var == "DATABASE_URL":
            if not value.startswith("mysql+pymysql://"):
                errors.append("DATABASE_URL debe empezar con mysql+pymysql://")
            elif "HOST.a.aivencloud.com" in value or "USUARIO" in value or "CONTRASEÑA" in value:
                errors.append("DATABASE_URL parece un placeholder — pon tus credenciales reales de Aiven")
    return errors


def check_db_connection() -> tuple[bool, str]:
    from sqlalchemy import text
    from app.core.database import get_engine

    with get_engine().connect() as conn:
        result = conn.execute(text("SELECT 1")).scalar()
    return True, f"SELECT 1 = {result}"


def main() -> int:
    load_dotenv()

    print("=" * 60)
    print("  Verificación de entorno — Conteos API")
    print("=" * 60)
    print()

    errors = check_env_vars()
    if errors:
        print("[ERROR] Variables de entorno:")
        for err in errors:
            print(f"   • {err}")
        print()
        print("Crea un archivo .env en la raíz del proyecto con tus valores de Aiven.")
        print("Usa .env.example como plantilla.")
        return 1

    print("[OK] Variables requeridas presentes")
    print(f"   DATABASE_URL: {mask_url(os.environ['DATABASE_URL'])}")
    print(f"   SECRET_KEY:   {'*' * 8} ({len(os.environ['SECRET_KEY'])} chars)")
    print()

    print("Variables opcionales:")
    for var in OPTIONAL_VARS:
        val = os.getenv(var, "(default)")
        print(f"   {var}: {val}")
    print()

    print("Probando conexión a Aiven MySQL...")
    try:
        ok, msg = check_db_connection()
        if ok:
            print(f"[OK] Conexion OK - {msg.replace(chr(0x2192), '->')}")
            print()
            print("Listo para configurar las mismas variables en Vercel.")
            return 0
    except Exception as exc:
        print(f"[ERROR] Error de conexion: {exc}")
        print()
        print("Revisa:")
        print("  1. Credenciales y host/puerto en DATABASE_URL")
        print("  2. Firewall de Aiven - permite 0.0.0.0/0 (Vercel usa IPs dinamicas)")
        print("  3. DB_SSL_VERIFY=false para Aiven en serverless")
        return 1

    return 1


if __name__ == "__main__":
    sys.exit(main())

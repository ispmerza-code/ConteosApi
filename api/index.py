import sys
import os

# Asegurar que el directorio raíz del proyecto esté en el path
# para que `main.py` y el paquete `app/` sean importables desde aquí.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: E402

# Vercel requiere una instancia FastAPI llamada `app` en el entrypoint.
# Se reexporta aqui por compatibilidad con despliegues que usen api/index.py.
__all__ = ["app"]

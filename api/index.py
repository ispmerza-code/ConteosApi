import sys
import os

# Asegurar que el directorio raíz del proyecto esté en el path
# para que `main.py` y el paquete `app/` sean importables desde aquí.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: E402  — ASGI app expuesta para Vercel

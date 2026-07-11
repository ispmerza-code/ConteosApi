Desplegar backend en Vercel

Pasos resumidos:

- Se añadió `api/index.py` que importa `app` desde `main.py` para exponer la aplicación ASGI en Vercel.
- `vercel.json` se actualizó para registrar funciones Python y enrutar `/api/*` hacia `/api/index.py`.

Requisitos en Vercel:

- Añadir las variables de entorno necesarias (BD, JWT_SECRET, etc.) en la sección Environment Variables del proyecto en Vercel.
 - Añadir las variables de entorno necesarias (BD, JWT_SECRET, etc.) en la sección Environment Variables del proyecto en Vercel.
	- Establecer `NEXT_PUBLIC_API_URL` a `/api` para que el frontend llame a las funciones internas del mismo despliegue.
- Asegurarse de que `requirements.txt` incluya todas las dependencias (ya contiene `fastapi`, `uvicorn`, `sqlalchemy`, `pymysql`, etc.).

Comandos locales para probar:

1. Crear e activar entorno virtual (Windows PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Ejecutar servidor local con Uvicorn:

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Notas de despliegue en Vercel:

- La ruta base de la API queda en `/api/...` tras el mapeo. Por ejemplo, `GET /api/health` apuntará a la función ASGI.
- Si la base de datos no es accesible desde el entorno de Vercel, la inicialización de tablas/migraciones no se ejecutará correctamente; configurar la cadena de conexión en las variables de entorno.
- Si prefieres que la API se sirva en la raíz (ej. `/health`), se requieren rutas adicionales o un proxy; en este repo dejamos la API bajo `/api/` para compatibilidad con Vercel.

Si quieres, puedo intentar desplegar (con tu confirmación y credenciales) o ayudarte a configurar las variables de entorno en Vercel paso a paso.

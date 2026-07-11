# Paso 2 — Desplegar backend en Vercel

Repositorio: https://github.com/ispmerza-code/ConteosApi

---

## Configuracion del proyecto en Vercel

| Campo | Valor |
|---|---|
| **Framework Preset** | **Other** (NO Next.js) |
| **Root Directory** | `.` (raiz — no `conteos-frontend`) |
| **Build Command** | *(vacio)* |
| **Install Command** | `pip install -r requirements.txt` |
| **Output Directory** | *(vacio)* |

> Si el Framework queda en Next.js, Vercel ignora los archivos Python y el deploy falla.

---

## Variables de entorno

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `mysql+pymysql://avnadmin:...@scisp-merza-mysql-scisp-merza.k.aivencloud.com:21842/siniestros_scisp` |
| `DB_SSL_VERIFY` | `false` |
| `SECRET_KEY` | *(tu clave de 64 chars)* |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` |
| `ALLOWED_ORIGINS` | `*` |
| `LOG_LEVEL` | `info` |

Marca **Production**, **Preview** y **Development**.

> **Importante:** Si Aiven te da `mysql://...?ssl-mode=REQUIRED`, en Vercel usa
> `mysql+pymysql://...` (con `+pymysql` y BD `siniestros_scisp`). El codigo
> normaliza `mysql://` automaticamente, pero conviene pegarlo bien desde el inicio.

---

## Verificar despues del deploy

```
https://TU-URL.vercel.app/
https://TU-URL.vercel.app/health
https://TU-URL.vercel.app/health/db
https://TU-URL.vercel.app/docs
```

| Endpoint | Respuesta esperada |
|---|---|
| `/` | `{"message": "API Conteos SCISP - ..."}` |
| `/health` | `{"status": "ok"}` |
| `/health/db` | `{"status": "ok", "db": "connected"}` |

---

## Error conocido (corregido)

```
The pattern "api/index.py" defined in functions doesn't match any Serverless Functions
```

**Causa:** Vercel CLI 55+ usa `main.py` como entrypoint FastAPI, no `api/index.py` con imports indirectos.

**Solucion:** `vercel.json` apunta a `main.py` y `pyproject.toml` define `entrypoint = "main:app"`.

---

## Siguiente paso

**Paso 3:** Desplegar frontend con `NEXT_PUBLIC_API_URL` = URL del backend.

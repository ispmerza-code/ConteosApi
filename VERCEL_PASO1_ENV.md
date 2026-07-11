# Paso 1 — Variables de entorno (Aiven + Vercel)

## Resumen

Necesitas **2 proyectos en Vercel** (aún no creados) y **1 base de datos en Aiven** (ya la tienes).

| Proyecto Vercel | Root Directory | Variables |
|---|---|---|
| `conteos-api` (backend) | `.` (raíz del repo) | Ver tabla abajo |
| `conteos-frontend` | `conteos-frontend` | `NEXT_PUBLIC_API_URL` |

---

## 1. Verificar Aiven localmente

### 1.1 Crear `.env` en la raíz del proyecto

Copia `.env.example` → `.env` y completa con tus datos de Aiven:

```env
DATABASE_URL=mysql+pymysql://avnadmin:TU_PASSWORD@mysql-xxxxx.a.aivencloud.com:12345/siniestros_scisp
DB_SSL_VERIFY=false
SECRET_KEY=28386e567b72b8ddfff0aff1c95d234adb3fec13b858091f3571f5ce8b47d9fb
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
ALLOWED_ORIGINS=*
LOG_LEVEL=info
```

> **SECRET_KEY:** usa la generada arriba o crea una nueva con:
> `python -c "import secrets; print(secrets.token_hex(32))"`

> **Contraseñas con caracteres especiales:** codifica en URL (`@` → `%40`, `#` → `%23`, etc.)

### 1.2 Firewall de Aiven

En el panel de Aiven → tu servicio MySQL → **Allowed IP addresses**:

- Añade `0.0.0.0/0` (Vercel no tiene IP fija en plan gratuito)
- O restringe solo a tu IP local para pruebas, y luego abre para Vercel

### 1.3 Ejecutar verificación

```powershell
cd c:\Users\MERZA\Desktop\Conteos-API-main\Conteos-API-main
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python verify_env.py
```

Si ves `✅ Conexión OK`, la cadena de Aiven es correcta.

---

## 2. Variables en Vercel — Proyecto BACKEND

Crea el proyecto en [vercel.com/new](https://vercel.com/new) apuntando a este repo.

**Settings → General → Root Directory:** `.` (raíz, no subcarpeta)

**Settings → Environment Variables** (marca Production, Preview y Development):

| Variable | Valor | Notas |
|---|---|---|
| `DATABASE_URL` | `mysql+pymysql://...@....aivencloud.com:PORT/siniestros_scisp` | Igual que tu `.env` local |
| `DB_SSL_VERIFY` | `false` | Requerido para Aiven en serverless |
| `SECRET_KEY` | *(misma clave que en .env)* | Mínimo 32 caracteres |
| `ALGORITHM` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | 8 horas de sesión |
| `ALLOWED_ORIGINS` | `*` | **Temporal** hasta tener URL del frontend |
| `LOG_LEVEL` | `info` | |

---

## 3. Variables en Vercel — Proyecto FRONTEND

Segundo proyecto, mismo repo.

**Settings → General → Root Directory:** `conteos-frontend`

**Settings → Environment Variables:**

| Variable | Valor | Notas |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://TU-BACKEND.vercel.app` | URL del proyecto backend **sin** `/api` al final |

> La URL exacta la obtienes después del primer deploy del backend.
> El frontend llama a `{NEXT_PUBLIC_API_URL}/api/v1/auth/login`, etc.

---

## 4. CORS — actualizar después del deploy del frontend

Cuando Vercel te asigne la URL del frontend (ej. `https://conteos-frontend-abc123.vercel.app`):

1. Ve al proyecto **backend** en Vercel → Environment Variables
2. Cambia `ALLOWED_ORIGINS` de `*` a:
   ```
   https://conteos-frontend-abc123.vercel.app,http://localhost:3000
   ```
3. Redeploy el backend

---

## 5. Checklist Paso 1

- [ ] `.env` local creado con credenciales de Aiven
- [ ] Firewall de Aiven permite conexiones (0.0.0.0/0 o tu IP)
- [ ] `python verify_env.py` → Conexión OK
- [ ] `SECRET_KEY` generada y guardada (local + anotada para Vercel)
- [ ] Variables del backend listas para pegar en Vercel
- [ ] Variable `NEXT_PUBLIC_API_URL` preparada (se completará tras deploy backend)

---

## Siguiente paso

**Paso 2:** Desplegar el backend en Vercel y probar `/health` y `/health/db`.

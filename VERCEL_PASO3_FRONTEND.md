# Paso 3 — Desplegar frontend en Vercel

Repositorio: https://github.com/ispmerza-code/ConteosApi

Backend en produccion: https://conteos-api-eight.vercel.app

---

## 1. Crear segundo proyecto en Vercel

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Importa **ispmerza-code/ConteosApi** (mismo repo que el backend)
3. Configura:

| Campo | Valor |
|---|---|
| **Project Name** | `conteos-frontend` (o el que prefieras) |
| **Framework Preset** | **Next.js** (auto-detectado) |
| **Root Directory** | `conteos-frontend` |
| **Build Command** | `npm run build` (default) |
| **Install Command** | `npm install` (default) |
| **Output Directory** | *(dejar default — Next.js lo maneja)* |

> **Importante:** Root Directory debe ser `conteos-frontend`, NO la raiz del repo.

---

## 2. Variable de entorno

En **Settings → Environment Variables**:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://conteos-api-eight.vercel.app` |

Marca **Production**, **Preview** y **Development**.

> Sin barra final. El frontend llama a `{URL}/api/v1/auth/login`, etc.

---

## 3. Deploy

Click **Deploy** y espera a que el build termine.

URL esperada (ejemplo): `https://conteos-frontend.vercel.app`

---

## 4. Actualizar CORS en el backend

Cuando tengas la URL final del frontend (ej. `https://conteos-frontend-abc123.vercel.app`):

1. Ve al proyecto **conteos-api** en Vercel → **Environment Variables**
2. Cambia `ALLOWED_ORIGINS` de `*` a:
   ```
   https://TU-FRONTEND.vercel.app,http://localhost:3000
   ```
3. **Redeploy** el backend

---

## 5. Verificar

1. Abre la URL del frontend en el navegador
2. Login con:
   - **ID Usuario:** `1`
   - **Contraseña:** `admin123`
3. Debe redirigir al dashboard

Si hay error de red en el login:
- Revisa que `NEXT_PUBLIC_API_URL` apunte al backend correcto
- Revisa CORS en el backend (`ALLOWED_ORIGINS`)
- Abre DevTools → Network y mira la peticion a `/api/v1/auth/login`

---

## Checklist

- [ ] Proyecto Vercel con Root Directory = `conteos-frontend`
- [ ] `NEXT_PUBLIC_API_URL` configurada
- [ ] Build exitoso
- [ ] Login funciona
- [ ] CORS actualizado en backend con URL del frontend

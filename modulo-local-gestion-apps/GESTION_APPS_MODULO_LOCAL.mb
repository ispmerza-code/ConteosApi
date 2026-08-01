# Módulo local — Gestión de APPs (copia visual de `/apps`)

> Archivo pensado para **pegar / insertar en el servidor local** que gobierna `usuariossucursal`.  
> Objetivo: misma UI que Conteos online (`/apps`), sin que el cambio visual sea notable, y que **Conteos online redirija** a este módulo local.

---

## 1. Contexto / arquitectura

| Capa | Dónde corre hoy | Qué debe pasar |
|------|-----------------|----------------|
| UI Conteos (Vercel / online) | `conteos-frontend` → ruta `/apps` | **Redirigir** al módulo local |
| Gobernanza tabla APP↔sucursal | Servidor **local** (`usuariossucursal`) | Aquí vive el CRUD de asignaciones |
| API de conteos | Online (Aiven / Vercel API) | Sigue para login/token si se reutiliza JWT |

Flujo deseado:

```
Usuario en Conteos online
  → Dashboard → "Gestión APPs"
  → /apps (online) REDIRIGE a https://<servidor-local>/apps
  → Módulo local (misma UI) habla con API LOCAL de gobernanza
  → Guarda asignaciones en BD/tabla local
```

---

## 2. Quién puede usar el módulo (igual que Conteos)

```
Niveles: 1 (Admin), 2 (Coord. zona), 8 (equiv. admin)
IDs extra: 52033, 61752
Nivel 2: solo puede asignar centros que él tiene en usuariossucursal
```

---

## 3. Contrato de API que debe exponer el servidor local

Replicar (o adaptar) estos endpoints; la UI espera **exactamente** esta forma:

### `GET /api/v1/auth/apps`
Lista usuarios APP (`NivelUsuario = 4`).

```json
[
  {
    "IdUsuarios": 55565,
    "NombreUsuario": "Nombre Apellido",
    "NivelUsuario": 4,
    "Estatus": 1,
    "sucursales_count": 75
  }
]
```

### `GET /api/v1/conteos/sucursales`
Catálogo de centros (solo lectura para pintar el modal).

```json
[
  {
    "IdCentro": "T186",
    "Sucursales": "Adrian Puga",
    "IdZona": 4,
    "Zona": "Occidente",
    "IdTipoSucursal": "T"
  }
]
```

### `GET /api/v1/auth/apps/{user_id}/sucursales`
Sucursales ya asignadas al APP (o las del coordinador si `user_id` es nivel 2).

Misma forma que el array de sucursales.

### `PUT /api/v1/auth/apps/{user_id}/sucursales`
Body: array de strings `IdCentro`.

```json
["T186", "C141", "T187"]
```

Respuesta sugerida:

```json
{ "message": "N sucursales asignadas correctamente", "count": N }
```

Auth: header `Authorization: Bearer <token>` (recomendado reutilizar el JWT de Conteos online al redirigir).

---

## 4. Contenido de este paquete

Carpeta: `modulo-local-gestion-apps/`

| Archivo | Uso |
|---------|-----|
| `GestionAppsPage.tsx` | **Copia 1:1** de la página Next.js actual (`conteos-frontend/src/app/apps/page.tsx`). Pegar en tu app Next local como `app/apps/page.tsx` (o ruta equivalente). |
| `index.html` | **Copia visual standalone** (Tailwind CDN + JS). Sirve si el servidor local no es Next: Apache/IIS/Nginx/static. |
| Este `.md` | Prompt + especificación para el equipo / agente en el servidor local. |

---

## 5. Prompt listo para pegar en el servidor local (agente / desarrollador)

Copia el bloque siguiente tal cual:

```
Necesito implementar en ESTE servidor local el módulo "Gestión de APPs"
con paridad visual respecto a Conteos online (/apps).

Objetivo:
- Misma pantalla: listado de usuarios APP (nivel 4), filtros, paginación 15,
  modal de asignación de sucursales por zona, checkboxes, seleccionar todas/zona,
  badges de color por letra de IdCentro, guardar bulk en usuariossucursal.
- La gobernanza (escritura) debe ir contra la BD/API LOCAL de este servidor.
- No crear/editar/borrar la tabla sucursales; solo asignaciones usuario↔centro.
- Permisos: niveles 1, 2, 8 e IDs 52033 y 61752.
  Nivel 2 solo asigna centros que él tiene asignados.
- UI: Tailwind, mismos textos ("Gestión de APPs", "Asignar Sucursales",
  "Guardar Asignaciones"), header sticky, modal azul, tabla desktop / cards móvil.

Implementación sugerida:
1) Si el proyecto es Next.js: usar el archivo GestionAppsPage.tsx del paquete
   como app/apps/page.tsx y apuntar authAPI/conteosAPI a la API local.
2) Si es estático: servir index.html y configurar window.GESTION_APPS_CONFIG
   con apiBaseUrl.

Endpoints requeridos (contrato JSON en la sección 3 del documento).
Autenticación Bearer token (recibido por query ?token= al llegar desde Conteos
online, o localStorage).

No cambies la estética: el usuario no debe notar diferencia vs Conteos online.
```

---

## 6. Cómo redirigir Conteos online `/apps` → módulo local

En el frontend online (`conteos-frontend`), la ruta `/apps` debe dejar de renderizar la gestión y redirigir.

Ejemplo (sustituye la URL):

```ts
// conteos-frontend/src/app/apps/page.tsx  (versión online: solo redirect)
'use client'
import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'

const LOCAL_APPS_URL = process.env.NEXT_PUBLIC_GESTION_APPS_URL
  || 'https://TU-SERVIDOR-LOCAL/apps'

export default function AppsRedirect() {
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const url = new URL(LOCAL_APPS_URL)
    if (token) url.searchParams.set('token', token)
    if (user?.IdUsuarios) url.searchParams.set('uid', String(user.IdUsuarios))
    window.location.replace(url.toString())
  }, [isLoading, user])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  )
}
```

Variable de entorno en Vercel:

```
NEXT_PUBLIC_GESTION_APPS_URL=https://intranet.tudominio.local/apps
```

CORS en API local: permitir origen del front local y, si aplica, el de Vercel solo para el redirect (el PUT lo hace el módulo local).

---

## 7. Paridad visual (checklist)

- [ ] Fondo `bg-gray-50`, header blanco sticky
- [ ] Título **Gestión de APPs** + subtítulo *Asignar sucursales a usuarios de la aplicación móvil*
- [ ] Chip azul con conteo de usuarios
- [ ] Filtros: buscar, estado, limpiar
- [ ] Tabla: ID, Nombre (+ avatar iniciales), Estado, # Sucursales, botón Sucursales
- [ ] Cards en móvil
- [ ] Paginación 15
- [ ] Modal header `bg-blue-600`, contadores Seleccionadas/Disponibles
- [ ] Sucursales agrupadas por Zona, badge color por primera letra de IdCentro
- [ ] Guardar / Cancelar / feedback “¡Guardado!”

---

## 8. Notas

- En Conteos online el placeholder del buscador dice “Buscar monitoristas…” pero lista usuarios **APP (nivel 4)** — mantener el mismo texto para no notar cambio.
- Nivel de monitorista de validación en conteos es **32** (no confundir con este módulo de APPs).
- Este paquete **no** modifica la BD online; la escritura debe apuntar al servidor local.

---

## 9. Siguiente paso recomendado

1. Copiar `modulo-local-gestion-apps/` al repo del servidor local.  
2. Pegar el **prompt de la sección 5** al agente/dev local.  
3. Conectar endpoints a la tabla local `usuariossucursal`.  
4. En Conteos online: redirect de `/apps` + `NEXT_PUBLIC_GESTION_APPS_URL`.  
5. Probar: login online → Gestión APPs → aterriza en local con la misma cara.

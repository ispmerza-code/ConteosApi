<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Proyecto Frontend Sistema de Conteos

Este es un frontend Next.js 15 que consume una API FastAPI para el sistema de conteos de productos en sucursales.

### Stack Técnico
- **Framework**: Next.js 15.5.4 con App Router
- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Estado**: useState local (sin estado global)
- **HTTP**: Axios
- **Icons**: React Icons
- **API Backend**: FastAPI (Python) en http://localhost:8000

### Funcionalidades del Sistema
1. **Autenticación** por roles (administrador, supervisor, cca, app)
2. **Dashboard** con resumen de conteos
3. **Crear conteo** (todos los roles)
4. **Asignar conteo** (admin, supervisor, cca)
5. **Editar conteo** (admin, supervisor) - solo conteos pendientes
6. **Contestar conteo** (todos los roles) - actualizar existencias físicas
7. **Eliminar conteo** (solo admin)

### Estructura de Datos
- **Conteo**: fecha, centro, usuario, productos
- **Productos**: código de barras, existencias sistema, existencias físicas
- **Estados**: 0=pendiente, 1=finalizado

### Reglas de Negocio
- Un conteo puede tener múltiples productos
- Solo se editan conteos pendientes (Envio=0)
- Al contestar se cambia estado a finalizado (Envio=1)
- Fechas de asignación no pueden ser anteriores a hoy

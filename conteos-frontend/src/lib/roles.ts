/** Constantes de roles/permisos alineadas con app/core/security.py */

export const NIVELES_CONTEOS_PERMITIDOS = new Set([1, 2, 4, 7, 8, 33])

export const NIVELES_CONTESTAR = new Set([1, 2, 4, 8])
export const NIVELES_ASIGNAR = new Set([1, 2, 33, 7, 8])
export const NIVELES_EDITAR = new Set([1, 2, 33, 7, 8])
export const NIVELES_ELIMINAR = new Set([1, 8])
export const NIVELES_VALIDAR = new Set([1, 33, 7, 8])
export const NIVELES_GESTION_APPS = new Set([1, 2, 8])
export const USERS_GESTION_APPS = new Set([52033, 61752])

export const MSG_SIN_PERMISO_CONTEOS = 'No tienes permiso de visualizar conteos'

export function puedeAccederConteos(nivel: number): boolean {
  return NIVELES_CONTEOS_PERMITIDOS.has(nivel)
}

export function puedeGestionarApps(nivel: number, userId: number): boolean {
  return NIVELES_GESTION_APPS.has(nivel) || USERS_GESTION_APPS.has(userId)
}

export function getRoleByLevel(nivel: number): string {
  switch (nivel) {
    case 1:
      return 'administrador'
    case 2:
      return 'supervisor'
    case 4:
      return 'app'
    case 7:
      return 'admin_cctv'
    case 8:
      return 'administrador' // mismos permisos que nivel 1
    case 33:
      return 'monitorista_soporte'
    default:
      return 'desconocido'
  }
}

export function getRoleLabel(nivel: number): string {
  switch (nivel) {
    case 1:
      return 'Administrador'
    case 2:
      return 'Coordinador de Zona'
    case 4:
      return 'APP'
    case 7:
      return 'Admin CCTV'
    case 8:
      return 'Administrador'
    case 33:
      return 'Monitorista Soporte'
    default:
      return 'Sin acceso'
  }
}

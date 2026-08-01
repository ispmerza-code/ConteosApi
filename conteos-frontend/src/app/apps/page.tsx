'use client'

/**
 * Gobernanza de asignaciones APP↔sucursal vive en el servidor local SCISP.
 * Auth independiente: no se comparte ni se envía JWT. Solo redirect.
 * Destino: NEXT_PUBLIC_GESTION_APPS_URL o http://10.57.0.98:8000/conteos/sucursales/app
 */
import { useEffect } from 'react'

const LOCAL_APPS_URL =
  process.env.NEXT_PUBLIC_GESTION_APPS_URL ||
  'http://10.57.0.98:8000/conteos/sucursales/app'

export default function AppsRedirect() {
  useEffect(() => {
    // Auth distinta: no enviar JWT ni ?token=. Solo redirigir.
    window.location.replace(LOCAL_APPS_URL)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  )
}

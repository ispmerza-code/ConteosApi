'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiSearch, FiMapPin, FiChevronRight, FiLogOut, FiArrowLeft, FiMap } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { conteosAPI, authAPI } from '@/lib/api'
import { Sucursal } from '@/types/api'

export default function SeleccionarSucursal() {
  const { user, selectSucursal, logout, isLoading } = useAuth()
  const router = useRouter()

  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedZona, setSelectedZona] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
      return
    }
    if (user && user.NivelUsuario !== 4) {
      router.push('/dashboard')
      return
    }
    if (user) {
      loadSucursales()
    }
  }, [user, isLoading])

  const loadSucursales = async () => {
    try {
      // NivelUsuario=4 (APP): solo mostrar sus sucursales asignadas
      const data = user?.NivelUsuario === 4
        ? await authAPI.getAppSucursales(user.IdUsuarios)
        : await conteosAPI.getSucursales()
      if (user?.NivelUsuario === 4 && data.length === 0) {
        setError('No tienes sucursales asignadas. Contacta a tu coordinador.')
      }
      setSucursales(data)
    } catch {
      setError('Error al cargar las sucursales')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (sucursal: Sucursal) => {
    selectSucursal(sucursal)
    router.push('/sucursal')
  }

  // Zonas únicas ordenadas
  const zonas = [...new Set(sucursales.map(s => s.Zona || 'Sin zona'))].sort()

  // Sucursales de la zona seleccionada con búsqueda
  const sucursalesDeZona = sucursales
    .filter(s => (s.Zona || 'Sin zona') === selectedZona)
    .filter(s =>
      s.Sucursales.toLowerCase().includes(search.toLowerCase()) ||
      s.IdCentro.toLowerCase().includes(search.toLowerCase())
    )

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => { setStep(1); setSearch('') }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FiArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {step === 1 ? 'Seleccionar Zona' : `Zona: ${selectedZona}`}
              </h1>
              <p className="text-sm text-gray-500">
                {user?.NombreUsuario} — {step === 1 ? 'elige la zona de trabajo' : 'elige la sucursal de trabajo'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <FiLogOut className="w-4 h-4" />
            Salir
          </button>
        </div>

        {/* Indicador de pasos */}
        <div className="max-w-3xl mx-auto px-4 pb-3 flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step === 1 ? 'text-blue-600' : 'text-green-600'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'}`}>
              {step === 2 ? '✓' : '1'}
            </span>
            Zona
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step === 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
            Sucursal
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* PASO 1: Lista de zonas */}
        {step === 1 && (
          <>
            {zonas.length === 0 && (
              <p className="text-center text-gray-500 py-12">No hay zonas disponibles</p>
            )}
            <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100 overflow-hidden">
              {zonas.map(zona => {
                const count = sucursales.filter(s => (s.Zona || 'Sin zona') === zona).length
                return (
                  <button
                    key={zona}
                    onClick={() => { setSelectedZona(zona); setStep(2); setSearch('') }}
                    className="w-full flex items-center gap-4 px-4 py-4 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <FiMap className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{zona}</p>
                      <p className="text-sm text-gray-500">{count} sucursal{count !== 1 ? 'es' : ''}</p>
                    </div>
                    <FiChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* PASO 2: Sucursales de la zona */}
        {step === 2 && (
          <>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {sucursalesDeZona.length === 0 && (
              <p className="text-center text-gray-500 py-12">No se encontraron sucursales</p>
            )}

            <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100 overflow-hidden">
              {sucursalesDeZona.map(sucursal => (
                <button
                  key={sucursal.IdCentro}
                  onClick={() => handleSelect(sucursal)}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FiMapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{sucursal.Sucursales}</p>
                    <p className="text-sm text-gray-500">ID: {sucursal.IdCentro}</p>
                  </div>
                  <FiChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

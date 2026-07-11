'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FiMapPin, FiRefreshCw, FiLogOut, FiList, FiCheckCircle,
  FiClock, FiPackage, FiChevronRight, FiArrowRight, FiEdit,
  FiPlus, FiClipboard
} from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { conteosAPI } from '@/lib/api'
import { ConteoListResponse } from '@/types/api'
import { formatShortDate } from '@/lib/dateUtils'

export default function SucursalPage() {
  const { user, selectedSucursal, clearSucursal, logout } = useAuth()
  const router = useRouter()

  const [conteos, setConteos] = useState<ConteoListResponse[]>([])
  const [usuariosMap, setUsuariosMap] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'todos' | 'pendientes' | 'finalizados'>('todos')

  useEffect(() => {
    if (!selectedSucursal) {
      router.push('/seleccionar-sucursal')
      return
    }
    loadData()
  }, [selectedSucursal])

  const loadData = async () => {
    if (!selectedSucursal) return
    try {
      setLoading(true)
      const [data, usuarios] = await Promise.all([
        conteosAPI.getConteosBySucursal(selectedSucursal.IdCentro),
        conteosAPI.getUsuarios()
      ])
      setConteos(data.sort((a: ConteoListResponse, b: ConteoListResponse) => b.idConteo - a.idConteo))
      const map: Record<number, string> = {}
      usuarios.forEach((u: { IdUsuarios: number; NombreUsuario: string }) => {
        map[u.IdUsuarios] = u.NombreUsuario
      })
      setUsuariosMap(map)
    } catch (err) {
      console.error('Error al cargar datos de la sucursal:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCambiarSucursal = () => {
    clearSucursal()
    router.push('/seleccionar-sucursal')
  }

  const filtered = conteos.filter(c => {
    if (activeTab === 'pendientes') return c.Envio === 0
    if (activeTab === 'finalizados') return c.Envio === 1
    return true
  })

  const pendientes = conteos.filter(c => c.Envio === 0).length
  const finalizados = conteos.filter(c => c.Envio === 1).length

  if (!selectedSucursal) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <FiMapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  {selectedSucursal.Sucursales}
                </h1>
                <p className="text-xs text-gray-500">
                  ID: {selectedSucursal.IdCentro}
                  {selectedSucursal.Zona ? ` · Zona ${selectedSucursal.Zona}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                title="Actualizar"
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleCambiarSucursal}
                className="text-xs text-blue-600 hover:underline hidden sm:block"
              >
                Cambiar sucursal
              </button>
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Cerrar sesión"
              >
                <FiLogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{conteos.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total conteos</p>
          </div>
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">{pendientes}</p>
            <p className="text-xs text-yellow-600 mt-1">Pendientes</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{finalizados}</p>
            <p className="text-xs text-green-600 mt-1">Finalizados</p>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/conteos/crear')}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:bg-blue-50 hover:border-blue-300 transition-colors text-left shadow-sm"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <FiPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">Crear conteo</p>
              <p className="text-xs text-gray-500">Registrar conteo</p>
            </div>
          </button>
          {user?.NivelUsuario !== 4 && (
          <button
            onClick={() => router.push('/conteos/asignar')}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:bg-green-50 hover:border-green-300 transition-colors text-left shadow-sm"
          >
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <FiClipboard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">Asignar conteo</p>
              <p className="text-xs text-gray-500">A un usuario</p>
            </div>
          </button>
          )}
        </div>

        {/* Tabs de filtro */}
        <div>
          <div className="flex border-b border-gray-200 mb-4">
            {(['todos', 'pendientes', 'finalizados'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'todos' ? `Todos (${conteos.length})` : tab === 'pendientes' ? `Pendientes (${pendientes})` : `Finalizados (${finalizados})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FiPackage className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No hay conteos {activeTab !== 'todos' ? activeTab : ''} en esta sucursal</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(conteo => (
                <button
                  key={conteo.idConteo}
                  onClick={() => router.push(`/conteos/ver/${conteo.idConteo}`)}
                  className="w-full bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${conteo.Envio === 1 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900 text-sm">
                        Conteo #{conteo.idConteo}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        conteo.Envio === 1
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {conteo.Envio === 1 ? 'Finalizado' : 'Pendiente'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {formatShortDate(conteo.Fechal)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiPackage className="w-3 h-3" />
                        {conteo.total_productos ?? 0} productos
                      </span>
                      {usuariosMap[conteo.IdUsuario] && (
                        <span className="truncate">
                          → {usuariosMap[conteo.IdUsuario]}
                        </span>
                      )}
                    </div>
                  </div>
                  <FiChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ir al dashboard completo */}
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          Ver dashboard completo
          <FiArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

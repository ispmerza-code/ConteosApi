'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  FiSearch, FiMapPin, FiUser, FiX, FiCheck, FiArrowLeft,
  FiChevronLeft, FiChevronRight, FiAlertCircle
} from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { authAPI, conteosAPI } from '@/lib/api'

interface AppUser {
  IdUsuarios: number
  NombreUsuario: string
  NivelUsuario: number
  Estatus: number
  sucursales_count: number
}

interface Sucursal {
  IdCentro: string
  Sucursales: string
  IdZona: number | null
  Zona: string | null
  IdTipoSucursal?: string
}

// Usuarios con acceso a esta gestión (además de NivelUsuario 1, 2 y 8)
const USERS_CON_ACCESO = new Set([52033, 61752])
const puedeGestionar = (nivel: number, id: number) =>
  nivel === 1 || nivel === 2 || nivel === 8 || USERS_CON_ACCESO.has(id)

// Colores de badge por letra inicial del IdCentro
const BADGE_COLORS: Record<string, string> = {
  A: 'bg-blue-600',
  B: 'bg-teal-600',
  C: 'bg-indigo-600',
  D: 'bg-cyan-600',
  E: 'bg-sky-600',
  F: 'bg-violet-600',
  G: 'bg-purple-600',
  H: 'bg-fuchsia-600',
  M: 'bg-rose-600',
  N: 'bg-orange-600',
  P: 'bg-amber-600',
  T: 'bg-emerald-600',
}
const getBadgeColor = (id: string) => BADGE_COLORS[id[0]?.toUpperCase()] ?? 'bg-gray-600'

export default function GestionAppsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [appUsers, setAppUsers] = useState<AppUser[]>([])
  const [allSucursales, setAllSucursales] = useState<Sucursal[]>([])
  const [allowedCentrosForManager, setAllowedCentrosForManager] = useState<Set<string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filtros de la tabla de usuarios
  const [searchUsers, setSearchUsers] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'activo' | 'inactivo'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 15

  // Estado del modal
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [assignedCentros, setAssignedCentros] = useState<Set<string>>(new Set())
  const [searchModal, setSearchModal] = useState('')
  const [zonaFilter, setZonaFilter] = useState('')
  const [soloAsignadas, setSoloAsignadas] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [loadingModal, setLoadingModal] = useState(false)
  const [errorDetail, setErrorDetail] = useState('')

  // Verificar acceso
  useEffect(() => {
    if (isLoading) return
    if (!user) { router.push('/login'); return }
    if (!puedeGestionar(user.NivelUsuario, user.IdUsuarios)) {
      router.push('/dashboard')
    }
  }, [user, isLoading])

  // Cargar datos iniciales
  useEffect(() => {
    if (!user || !puedeGestionar(user.NivelUsuario, user.IdUsuarios)) return
    loadData()
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      setErrorDetail('')
      const [users, sucursales] = await Promise.all([
        authAPI.getAppUsuarios(),
        conteosAPI.getSucursales()
      ])
      setAppUsers(users)
      setAllSucursales(sucursales)
      // Si el usuario actual es Nivel 2, obtener sus sucursales permitidas
      if (user?.NivelUsuario === 2) {
        try {
          const asignadas = await authAPI.getAppSucursales(user.IdUsuarios)
          setAllowedCentrosForManager(new Set(asignadas.map((s: Sucursal) => s.IdCentro)))
        } catch (e) {
          setAllowedCentrosForManager(new Set())
        }
      } else {
        setAllowedCentrosForManager(null)
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } }; message?: string }
      const status = axiosErr?.response?.status
      const detail = axiosErr?.response?.data?.detail || axiosErr?.message || 'Error desconocido'
      setError('Error al cargar los datos')
      setErrorDetail(`HTTP ${status ?? 'N/A'}: ${detail}`)
    } finally {
      setLoading(false)
    }
  }

  // Abrir modal para un usuario
  const openModal = async (appUser: AppUser) => {
    setLoadingModal(true)
    setSelectedUser(appUser)
    setSearchModal('')
    setZonaFilter('')
    setSoloAsignadas(false)
    setSaveSuccess(false)
    try {
      const asignadas: Sucursal[] = await authAPI.getAppSucursales(appUser.IdUsuarios)
      setAssignedCentros(new Set(asignadas.map(s => s.IdCentro)))
    } catch {
      setAssignedCentros(new Set())
    } finally {
      setLoadingModal(false)
    }
  }

  const closeModal = () => {
    setSelectedUser(null)
    setAssignedCentros(new Set())
  }

  // Guardar asignaciones
  const handleSave = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      await authAPI.setAppSucursales(selectedUser.IdUsuarios, Array.from(assignedCentros))
      setAppUsers(prev => prev.map(u =>
        u.IdUsuarios === selectedUser.IdUsuarios
          ? { ...u, sucursales_count: assignedCentros.size }
          : u
      ))
      setSaveSuccess(true)
      setTimeout(() => closeModal(), 1000)
    } catch {
      // silently keep modal open
    } finally {
      setSaving(false)
    }
  }

  // Datos del modal
  const zonas = useMemo(
    () => [...new Set(allSucursales.map(s => s.Zona || 'Sin zona'))].sort(),
    [allSucursales]
  )

  const filteredModalSucursales = useMemo(() => {
    return allSucursales
      .filter(s => !allowedCentrosForManager || allowedCentrosForManager.has(s.IdCentro))
      .filter(s => !zonaFilter || (s.Zona || 'Sin zona') === zonaFilter)
      .filter(s =>
        !searchModal ||
        s.Sucursales.toLowerCase().includes(searchModal.toLowerCase()) ||
        s.IdCentro.toLowerCase().includes(searchModal.toLowerCase())
      )
      .filter(s => !soloAsignadas || assignedCentros.has(s.IdCentro))
  }, [allSucursales, zonaFilter, searchModal, soloAsignadas, assignedCentros])

  const sucursalesByZona = useMemo(() => {
    const map: Record<string, Sucursal[]> = {}
    filteredModalSucursales.forEach(s => {
      const z = s.Zona || 'Sin zona'
      if (!map[z]) map[z] = []
      map[z].push(s)
    })
    return map
  }, [filteredModalSucursales])

  const seleccionarTodas = () =>
    setAssignedCentros(new Set(
      allSucursales
        .filter(s => !allowedCentrosForManager || allowedCentrosForManager.has(s.IdCentro))
        .map(s => s.IdCentro)
    ))

  const deseleccionarTodas = () => setAssignedCentros(new Set())

  // Datos de la tabla de usuarios
  const filteredUsers = useMemo(() => {
    return appUsers
      .filter(u =>
        !searchUsers ||
        u.NombreUsuario.toLowerCase().includes(searchUsers.toLowerCase()) ||
        u.IdUsuarios.toString().includes(searchUsers)
      )
      .filter(u =>
        statusFilter === 'all' ||
        (statusFilter === 'activo' ? u.Estatus === 1 : u.Estatus !== 1)
      )
  }, [appUsers, searchUsers, statusFilter])

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-gray-700">{error}</p>
          {errorDetail && (
            <p className="text-xs text-gray-500 mt-1 font-mono bg-gray-100 rounded px-3 py-2 max-w-sm mx-auto break-all">{errorDetail}</p>
          )}
          <button onClick={loadData} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FiArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de APPs</h1>
                <p className="text-sm text-gray-500">
                  Asignar sucursales a usuarios de la aplicación móvil
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
              <FiUser className="w-3.5 h-3.5" />
              {filteredUsers.length} usuarios APP
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar monitoristas..."
              value={searchUsers}
              onChange={e => { setSearchUsers(e.target.value); setCurrentPage(1) }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as 'all' | 'activo' | 'inactivo'); setCurrentPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
          <button
            onClick={() => { setSearchUsers(''); setStatusFilter('all'); setCurrentPage(1) }}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Título tabla */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Monitoristas ({filteredUsers.length})
            </h2>
            {filteredUsers.length > 0 && (
              <span className="text-sm text-gray-500">
                Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} de {filteredUsers.length}
              </span>
            )}
          </div>

          {filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <FiUser className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No se encontraron usuarios APP</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursales</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentUsers.map(u => (
                      <tr key={u.IdUsuarios} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{u.IdUsuarios}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                              {u.NombreUsuario.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{u.NombreUsuario}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                            u.Estatus === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {u.Estatus === 1 ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                            <FiMapPin className="w-3.5 h-3.5" />
                            {u.sucursales_count}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => openModal(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            <FiMapPin className="w-3.5 h-3.5" />
                            Sucursales
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {currentUsers.map(u => (
                  <div key={u.IdUsuarios} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {u.NombreUsuario.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.NombreUsuario}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500">#{u.IdUsuarios}</span>
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            u.Estatus === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {u.Estatus === 1 ? 'Activo' : 'Inactivo'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-blue-700">
                            <FiMapPin className="w-3 h-3" /> {u.sucursales_count}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => openModal(u)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                    >
                      <FiMapPin className="w-3.5 h-3.5" />
                      Sucursales
                    </button>
                  </div>
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FiChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                  <span className="text-sm text-gray-600">Página {currentPage} de {totalPages}</span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Siguiente <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modal de asignación */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">

            {/* Modal header */}
            <div className="bg-blue-600 rounded-t-2xl px-4 py-4 flex flex-wrap items-center gap-3">
              <FiMapPin className="w-6 h-6 text-white shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white">Asignar Sucursales</h3>
                <p className="text-sm text-blue-100 truncate">
                  Usuario: {selectedUser.NombreUsuario} &bull; ID: {selectedUser.IdUsuarios}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500 text-white text-sm font-medium">
                  <FiCheck className="w-3.5 h-3.5" /> Seleccionadas: {assignedCentros.size}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500 text-white text-sm font-medium">
                  <FiMapPin className="w-3.5 h-3.5" /> Disponibles: {(
                    allowedCentrosForManager
                      ? allSucursales.filter(s => allowedCentrosForManager.has(s.IdCentro)).length
                      : allSucursales.length
                  )}
                </span>
                {assignedCentros.size === allSucursales.length ? (
                  <button
                    onClick={deseleccionarTodas}
                    className="px-3 py-1.5 rounded-full bg-white text-blue-700 text-sm font-medium hover:bg-blue-50 flex items-center gap-1"
                  >
                    <FiX className="w-3.5 h-3.5" /> Quitar Todas
                  </button>
                ) : (
                  <button
                    onClick={seleccionarTodas}
                    className="px-3 py-1.5 rounded-full bg-white text-blue-700 text-sm font-medium hover:bg-blue-50 flex items-center gap-1"
                  >
                    <FiCheck className="w-3.5 h-3.5" /> Seleccionar Todas
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-full hover:bg-blue-500 text-white transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal filtros */}
            <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o código..."
                  value={searchModal}
                  onChange={e => setSearchModal(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={zonaFilter}
                onChange={e => setZonaFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[170px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">🗺 Todas las zonas</option>
                {zonas.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm cursor-pointer border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 select-none">
                <input
                  type="checkbox"
                  checked={soloAsignadas}
                  onChange={e => setSoloAsignadas(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Solo asignadas</span>
              </label>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loadingModal ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : Object.keys(sucursalesByZona).length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <FiMapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No hay sucursales que coincidan con los filtros</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(sucursalesByZona)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([zona, sucsList]) => (
                      <div key={zona}>
                        <div className="flex items-center gap-2 mb-3 pb-1 border-b border-gray-100">
                          <FiMapPin className="w-4 h-4 text-blue-600 shrink-0" />
                          <h4 className="font-semibold text-gray-800">{zona}</h4>
                          <span className="text-xs text-gray-400">({sucsList.length} sucursales)</span>
                          <button
                            onClick={() => {
                              const next = new Set(assignedCentros)
                              const allInZona = sucsList.every(s => next.has(s.IdCentro))
                              sucsList.forEach(s => allInZona ? next.delete(s.IdCentro) : next.add(s.IdCentro))
                              setAssignedCentros(next)
                            }}
                            className="ml-auto text-xs text-blue-600 hover:underline"
                          >
                            {sucsList.every(s => assignedCentros.has(s.IdCentro)) ? 'Quitar zona' : 'Agregar zona'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                          {sucsList.map(s => {
                            const checked = assignedCentros.has(s.IdCentro)
                            return (
                              <label
                                key={s.IdCentro}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors select-none ${
                                  checked ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={e => {
                                    const next = new Set(assignedCentros)
                                    e.target.checked ? next.add(s.IdCentro) : next.delete(s.IdCentro)
                                    setAssignedCentros(next)
                                  }}
                                  className="rounded text-blue-600 shrink-0"
                                />
                                <span className={`px-1.5 py-0.5 text-xs font-bold text-white rounded shrink-0 ${getBadgeColor(s.IdCentro)}`}>
                                  {s.IdCentro}
                                </span>
                                <span className="text-sm text-gray-700 truncate flex-1">{s.Sucursales}</span>
                                {checked && <FiCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-500">
                {filteredModalSucursales.length} sucursal(es) mostradas
              </span>
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
                    saveSuccess
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                  }`}
                >
                  <FiCheck className="w-4 h-4" />
                  {saving ? 'Guardando...' : saveSuccess ? '¡Guardado!' : 'Guardar Asignaciones'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

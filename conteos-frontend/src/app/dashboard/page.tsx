'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlus, FiUser, FiEdit, FiClipboard, FiBarChart, FiUsers, FiPackage, FiLogOut, FiCalendar, FiList, FiAlertCircle, FiCheckCircle, FiTrendingUp, FiClock, FiBox, FiMapPin, FiSmartphone } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { conteosAPI } from '@/lib/api'
import { formatShortDate, formatTime } from '@/lib/dateUtils'
import { ConteoListResponse, User } from '@/types/api'

export default function Dashboard() {
  const { user, logout, selectedSucursal } = useAuth()
  const router = useRouter()
  
  const [stats, setStats] = useState({
    totalConteos: 0,
    conteosPendientes: 0,
    conteosNoValidados: 0,
    conteosValidados: 0,
    cambioCompletados: 0
  })
  const [allConteos, setAllConteos] = useState<ConteoListResponse[]>([])
  const [fullConteos, setFullConteos] = useState<ConteoListResponse[]>([])
  const [filtroEstatus, setFiltroEstatus] = useState<number | null>(null)
  const [sucursalesMap, setSucursalesMap] = useState<Record<string, string>>({})
  const [usuariosInfoMap, setUsuariosInfoMap] = useState<Record<number, {nombre: string, nivel: number}>>({})
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  useEffect(() => {
    if (filtroEstatus === null || fullConteos.length > 0 || !user) return
    const idCentroFiltro = user?.NivelUsuario === 4 ? selectedSucursal?.IdCentro : undefined
    conteosAPI.getConteos(idCentroFiltro).then(setFullConteos).catch(console.error)
  }, [filtroEstatus, fullConteos.length, user, selectedSucursal])

  const loadDashboardData = async () => {
    try {
      const idCentroFiltro = user?.NivelUsuario === 4 ? selectedSucursal?.IdCentro : undefined
      const [resumen, sucursales, usuarios] = await Promise.all([
        conteosAPI.getConteosResumen(idCentroFiltro),
        conteosAPI.getSucursales(),
        conteosAPI.getUsuarios()
      ])

      const sucursalesLookup = sucursales.reduce((acc: Record<string, string>, suc: { IdCentro: string; Sucursales: string }) => {
        acc[suc.IdCentro] = suc.Sucursales
        return acc
      }, {})

      setSucursalesMap(sucursalesLookup)

      const usuariosLookup = usuarios.reduce((acc: Record<number, {nombre: string, nivel: number}>, usuario: User) => {
        acc[usuario.IdUsuarios] = { nombre: usuario.NombreUsuario, nivel: usuario.NivelUsuario }
        return acc
      }, {})

      setUsuariosInfoMap(usuariosLookup)

      setStats({
        totalConteos: resumen.totalConteos,
        conteosPendientes: resumen.conteosPendientes,
        conteosNoValidados: resumen.conteosNoValidados,
        conteosValidados: resumen.conteosValidados,
        cambioCompletados: 0
      })
      setLastUpdate(new Date())
      setAllConteos(resumen.recientes)
      setFullConteos([])
      setFiltroEstatus(null)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (envio: number) => {
    switch (envio) {
      case 0:
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pendiente</span>
      case 1:
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Finalizado</span>
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Desconocido</span>
    }
  }

  const formatSucursal = (idCentro: string) => {
    const nombreSucursal = sucursalesMap[idCentro]
    return nombreSucursal ? `${idCentro} - ${nombreSucursal}` : idCentro
  }

  const formatUsuario = (idUsuario: number | null) => {
    if (idUsuario === null || idUsuario === undefined) return 'Sin asignar'
    const info = usuariosInfoMap[idUsuario]
    return info ? info.nombre : idUsuario.toString()
  }

  const getAppPerformer = (conteo: any): string | null => {
    // Quien realizó físicamente el conteo: primero IdRealizo si es nivel 4
    const realizoInfo = usuariosInfoMap[conteo.IdRealizo]
    if (realizoInfo?.nivel === 4) return realizoInfo.nombre
    // Si IdUsuario es nivel 4 (asignado)
    if (conteo.IdUsuario !== null && conteo.IdUsuario !== undefined) {
      const asignadoInfo = usuariosInfoMap[conteo.IdUsuario]
      if (asignadoInfo?.nivel === 4) return asignadoInfo.nombre
    }
    return null
  }

  // Función para calcular tiempo transcurrido
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `Hace ${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `Hace ${minutes} min`
    const hours = Math.floor(minutes / 60)
    return `Hace ${hours}h`
  }

  // Función para obtener rol por nivel de usuario
  const getRoleByLevel = (nivel: number): string => {
    switch(nivel) {
      case 1: return 'Administrador'
      case 2: return 'Supervisor'
      case 3: return 'CCA'
      case 4: return 'APP'
      default: return 'Usuario'
    }
  }

  const userRole = user ? getRoleByLevel(user.NivelUsuario) : null
  const canCreateConteo = user && ['Administrador', 'Supervisor', 'APP'].includes(userRole || '')
  const canAssignConteo = user && ['Administrador', 'Supervisor', 'CCA'].includes(userRole || '')
  const canEditConteo = user && ['Administrador', 'Supervisor', 'CCA'].includes(userRole || '')
  const canAnswerConteo = user?.NivelUsuario !== 3 // Monitoristas no contestan
  const canGestionarApps = user && (
    user.NivelUsuario === 1 || user.NivelUsuario === 2 || [52033, 61752].includes(user.IdUsuarios)
  )

  const conteosParaMostrar = filtroEstatus !== null
    ? fullConteos.filter((c: ConteoListResponse) => c.Estatus === filtroEstatus)
    : allConteos

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
                {user?.NombreUsuario?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                  <span>Bienvenido, {user?.NombreUsuario}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {userRole}
                  </span>
                  {selectedSucursal && (
                    <button
                      onClick={() => router.push('/sucursal')}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                    >
                      <FiMapPin className="w-3 h-3" />
                      {selectedSucursal.Sucursales}
                    </button>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
            >
              <FiLogOut className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* Pendientes - Prioridad Alta */}
          <button
            onClick={() => router.push('/conteos/contestar')}
            className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-6 text-left group ${
              stats.conteosPendientes > 0 ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FiAlertCircle className="h-6 w-6 text-yellow-600" />
                  <p className="text-sm font-medium text-gray-600">Pendientes</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.conteosPendientes}</p>
                {stats.conteosPendientes > 0 ? (
                  <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                    <FiClock className="w-3 h-3" />
                    {getTimeAgo(lastUpdate)}
                  </p>
                ) : (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <FiCheckCircle className="w-3 h-3" />
                    Sin pendientes 🎉
                  </p>
                )}
              </div>
              {stats.conteosPendientes > 0 && (
                <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded-full">
                  ¡Revisar!
                </span>
              )}
            </div>
          </button>

          {/* Sin Validar */}
          <button
            onClick={() => setFiltroEstatus(filtroEstatus === 0 ? null : 0)}
            className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-6 text-left group ${
              filtroEstatus === 0 ? 'ring-2 ring-red-400 ring-opacity-75' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FiAlertCircle className="h-6 w-6 text-red-500" />
                  <p className="text-sm font-medium text-gray-600">Sin Validar</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.conteosNoValidados}</p>
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <FiClock className="w-3 h-3" />
                  Estatus = 0
                </p>
              </div>
              {filtroEstatus === 0 && (
                <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">Filtrado</span>
              )}
            </div>
          </button>

          {/* Validados */}
          <button
            onClick={() => setFiltroEstatus(filtroEstatus === 1 ? null : 1)}
            className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-6 text-left group ${
              filtroEstatus === 1 ? 'ring-2 ring-green-400 ring-opacity-75' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FiCheckCircle className="h-6 w-6 text-green-600" />
                  <p className="text-sm font-medium text-gray-600">Validados</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.conteosValidados}</p>
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <FiCheckCircle className="w-3 h-3" />
                  Estatus = 1
                </p>
              </div>
              {filtroEstatus === 1 && (
                <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">Filtrado</span>
              )}
            </div>
          </button>

          {/* Total Conteos - Menos énfasis */}
          <button
            onClick={() => router.push('/conteos')}
            className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow hover:shadow-md transition-all duration-200 p-6 text-left group"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiBarChart className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Conteos</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalConteos}</p>
              </div>
            </div>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {canCreateConteo && (
              <button
                onClick={() => router.push('/conteos/crear')}
                className="group relative flex flex-col items-center justify-center px-6 py-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 hover:shadow-lg transition-all duration-200"
                title="Generar un nuevo conteo manual"
              >
                <FiPlus className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-center">Crear Conteo</span>
                <span className="text-xs text-blue-100 mt-1 text-center">Generar nuevo conteo</span>
              </button>
            )}
            
            {canAssignConteo && (
              <button
                onClick={() => router.push('/conteos/asignar')}
                className="group relative flex flex-col items-center justify-center px-6 py-5 bg-white border-2 border-green-500 text-green-700 rounded-xl hover:bg-green-50 hover:shadow-md transition-all duration-200"
                title="Asignar conteos a usuarios"
              >
                <FiUser className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-center">Asignar Conteo</span>
                <span className="text-xs text-green-600 mt-1 text-center">Asignar a usuarios</span>
              </button>
            )}
            
            {canAnswerConteo && (
              <button
                onClick={() => router.push('/conteos/contestar')}
                className="group relative flex flex-col items-center justify-center px-6 py-5 bg-white border-2 border-purple-500 text-purple-700 rounded-xl hover:bg-purple-50 hover:shadow-md transition-all duration-200"
                title="Responder conteos asignados"
              >
                <FiClipboard className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-center">Responder Conteos</span>
                <span className="text-xs text-purple-600 mt-1 text-center">Llenar conteos</span>
              </button>
            )}
            
            <button
              onClick={() => router.push('/conteos')}
              className="group relative flex flex-col items-center justify-center px-6 py-5 bg-white border-2 border-indigo-500 text-indigo-700 rounded-xl hover:bg-indigo-50 hover:shadow-md transition-all duration-200"
              title="Ver lista completa de conteos"
            >
              <FiList className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-center">Lista de Conteos</span>
              <span className="text-xs text-indigo-600 mt-1 text-center">Ver todos</span>
            </button>

            <button
              onClick={() => router.push('/estadisticas')}
              className="group relative flex flex-col items-center justify-center px-6 py-5 bg-white border-2 border-cyan-500 text-cyan-700 rounded-xl hover:bg-cyan-50 hover:shadow-md transition-all duration-200"
              title="Consultar productos faltantes y sobrantes"
            >
              <FiBarChart className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-center">Estadísticas</span>
              <span className="text-xs text-cyan-600 mt-1 text-center">Faltantes y sobrantes</span>
            </button>
            
            {user && user.NivelUsuario !== 4 && user.NivelUsuario !== 2 && (
            <button
              onClick={() => router.push('/catalogo')}
              className="group relative flex flex-col items-center justify-center px-6 py-5 bg-white border-2 border-teal-500 text-teal-700 rounded-xl hover:bg-teal-50 hover:shadow-md transition-all duration-200"
              title="Gestionar catálogo de productos"
            >
              <FiBox className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-center">Catálogo</span>
              <span className="text-xs text-teal-600 mt-1 text-center">Productos</span>
            </button>
            )}
            
            {canGestionarApps && (
              <button
                onClick={() => router.push('/apps')}
                className="group relative flex flex-col items-center justify-center px-6 py-5 bg-white border-2 border-violet-500 text-violet-700 rounded-xl hover:bg-violet-50 hover:shadow-md transition-all duration-200"
                title="Gestionar sucursales de usuarios APP"
              >
                <FiSmartphone className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-center">Gestión APPs</span>
                <span className="text-xs text-violet-600 mt-1 text-center">Asignar sucursales</span>
              </button>
            )}
            
            {canEditConteo && user?.NivelUsuario !== 2 && stats.conteosPendientes > 0 && (
              <button
                onClick={() => {
                  // Navegar a la página de lista de conteos con filtro de pendientes
                  router.push('/conteos?status=pendiente')
                }}
                className="group relative flex flex-col items-center justify-center px-6 py-5 bg-white border-2 border-orange-500 text-orange-700 rounded-xl hover:bg-orange-50 hover:shadow-md transition-all duration-200"
                title="Editar existencias de sistema en conteos pendientes"
              >
                <FiEdit className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-center">Editar Conteo</span>
                <span className="text-xs text-orange-600 mt-1 text-center">Modificar existencias</span>
              </button>
            )}
          </div>
        </div>

        {/* Recent Conteos Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {filtroEstatus === null ? 'Conteos Recientes' : filtroEstatus === 0 ? 'Conteos Sin Validar' : 'Conteos Validados'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {filtroEstatus === null ? 'Últimos 5 conteos registrados' : `${conteosParaMostrar.length} conteo(s) encontrado(s)`}
              </p>
            </div>
            {filtroEstatus !== null && (
              <button
                onClick={() => setFiltroEstatus(null)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Limpiar filtro
              </button>
            )}
          </div>
          <div className="md:hidden p-4 space-y-3">
            {conteosParaMostrar.map((conteo: any) => (
              <div key={conteo.idConteo} className="border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <p className="text-lg font-semibold text-gray-900">#{conteo.idConteo}</p>
                  {getStatusBadge(conteo.Envio)}
                </div>
                <div className="mt-3 space-y-1 text-sm text-gray-700">
                  <p><span className="text-gray-500">Centro:</span> {formatSucursal(conteo.IdCentro)}</p>
                  {(() => {
                    const app = getAppPerformer(conteo)
                    return app ? (
                      <p><span className="text-gray-500">APP:</span> <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium"><FiSmartphone className="w-3 h-3" />{app}</span></p>
                    ) : null
                  })()}
                  <p><span className="text-gray-500">Asignado:</span> {formatUsuario(conteo.IdUsuario)}</p>
                  <p>
                    <span className="text-gray-500">Fecha:</span> {formatShortDate(conteo.Fechal)}
                    {conteo.FechaHora && <span className="ml-2 text-gray-500"><FiClock className="inline w-3 h-3 mr-1" />{formatTime(conteo.FechaHora)}</span>}
                  </p>
                  <p><span className="text-gray-500">Productos:</span> {conteo.total_productos || 0}</p>
                </div>
              </div>
            ))}

            {conteosParaMostrar.length === 0 && (
              <div className="text-center py-8">
                <FiPackage className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No hay conteos registrados</p>
              </div>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[980px] divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 min-w-[90px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 min-w-[220px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Centro
                  </th>
                  <th className="px-6 py-3 min-w-[180px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    APP (Capturó)
                  </th>
                  <th className="px-6 py-3 min-w-[200px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario Asignado
                  </th>
                  <th className="px-6 py-3 min-w-[160px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha y Hora
                  </th>
                  <th className="px-6 py-3 min-w-[140px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 min-w-[120px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {conteosParaMostrar.map((conteo: any) => (
                  <tr key={conteo.idConteo} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{conteo.idConteo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatSucursal(conteo.IdCentro)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(() => {
                        const app = getAppPerformer(conteo)
                        return app
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium"><FiSmartphone className="w-3 h-3" />{app}</span>
                          : <span className="text-gray-400">—</span>
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatUsuario(conteo.IdUsuario)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center">
                          <FiCalendar className="w-4 h-4 mr-2 text-gray-400" />
                          {formatShortDate(conteo.Fechal)}
                        </div>
                        {conteo.FechaHora && (
                          <div className="flex items-center text-xs text-gray-500">
                            <FiClock className="w-3 h-3 mr-2 text-gray-400" />
                            {formatTime(conteo.FechaHora)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(conteo.Envio)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {conteo.total_productos || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {conteosParaMostrar.length === 0 && (
              <div className="text-center py-12">
                <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No hay conteos registrados</p>
                <p className="text-sm text-gray-400 mt-1">Crea tu primer conteo para comenzar</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

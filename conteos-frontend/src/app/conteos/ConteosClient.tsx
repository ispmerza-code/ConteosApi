'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiFilter, FiSearch, FiCalendar, FiUser, FiPackage, FiEdit, FiEye, FiTrash } from 'react-icons/fi'
import { conteosAPI } from '@/lib/api'
import { ConteoListResponse, User } from '@/types/api'
import { formatShortDate } from '@/lib/dateUtils'
import { useAuth } from '@/context/AuthContext'
import { NIVELES_ASIGNAR, NIVELES_EDITAR, NIVELES_ELIMINAR } from '@/lib/roles'

type StatusFilter = 'all' | 'pendiente' | 'sin_validar' | 'finalizado'

function statusToParams(status: StatusFilter): { envio?: number; estatus?: number } {
  if (status === 'pendiente') return { envio: 0 }
  if (status === 'sin_validar') return { envio: 1, estatus: 0 }
  if (status === 'finalizado') return { envio: 1, estatus: 1 }
  return {}
}

export function ConteosClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, selectedSucursal } = useAuth()
  const [conteos, setConteos] = useState<ConteoListResponse[]>([])
  const [totalConteos, setTotalConteos] = useState(0)
  const [sucursalesMap, setSucursalesMap] = useState<Record<string, string>>({})
  const [usuariosMap, setUsuariosMap] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadingPage, setLoadingPage] = useState(false)
  const [lookupsReady, setLookupsReady] = useState(false)
  const isFirstLoad = useRef(true)

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [centerFilter, setCenterFilter] = useState('')

  useEffect(() => {
    const statusParam = searchParams.get('status')
    if (statusParam === 'pendiente') {
      setStatusFilter('pendiente')
    }
  }, [searchParams])

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [sucursales, usuarios] = await Promise.all([
          conteosAPI.getSucursales(),
          conteosAPI.getUsuarios(),
        ])

        const sucursalesLookup = sucursales.reduce((acc: Record<string, string>, suc: { IdCentro: string; Sucursales: string }) => {
          acc[suc.IdCentro] = suc.Sucursales
          return acc
        }, {})

        setSucursalesMap(sucursalesLookup)

        const usuariosLookup = usuarios.reduce((acc: Record<number, string>, usuario: User) => {
          acc[usuario.IdUsuarios] = usuario.NombreUsuario
          return acc
        }, {})

        setUsuariosMap(usuariosLookup)
      } catch (error) {
        console.error('Error loading lookups:', error)
      } finally {
        setLookupsReady(true)
      }
    }

    void loadLookups()
  }, [])

  const loadConteos = useCallback(async () => {
    if (!lookupsReady) return

    try {
      if (isFirstLoad.current) {
        setLoading(true)
        isFirstLoad.current = false
      } else {
        setLoadingPage(true)
      }

      const idCentroFiltro = user?.NivelUsuario === 4 ? selectedSucursal?.IdCentro : undefined
      const statusParams = statusToParams(statusFilter)
      const skip = (currentPage - 1) * itemsPerPage

      const data = await conteosAPI.getConteosPaginados({
        skip,
        limit: itemsPerPage,
        idCentro: idCentroFiltro,
        ...statusParams,
        q: searchTerm,
        centro: centerFilter,
        fechaDesde: dateFrom || undefined,
        fechaHasta: dateTo || undefined,
        orden: sortOrder,
      })

      setConteos(data.items)
      setTotalConteos(data.total)
    } catch (error) {
      console.error('Error loading conteos:', error)
    } finally {
      setLoading(false)
      setLoadingPage(false)
    }
  }, [
    lookupsReady,
    user?.NivelUsuario,
    selectedSucursal?.IdCentro,
    statusFilter,
    currentPage,
    itemsPerPage,
    searchTerm,
    centerFilter,
    dateFrom,
    dateTo,
    sortOrder,
  ])

  useEffect(() => {
    if (!lookupsReady) return
    const timer = setTimeout(() => {
      void loadConteos()
    }, searchTerm ? 400 : 0)
    return () => clearTimeout(timer)
  }, [lookupsReady, loadConteos, searchTerm])

  const formatSucursal = (idCentro: string) => {
    const nombreSucursal = sucursalesMap[idCentro]
    return nombreSucursal ? `${idCentro} - ${nombreSucursal}` : idCentro
  }

  const formatUsuario = (idUsuario: number | null) => {
    if (idUsuario === null || idUsuario === undefined) return 'Sin asignar'
    const nombreUsuario = usuariosMap[idUsuario]
    return nombreUsuario ? `${idUsuario} - ${nombreUsuario}` : idUsuario.toString()
  }

  const getStatusBadge = (envio: number, estatus?: number) => {
    if (envio === 0) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pendiente</span>
    }
    if (envio === 1 && estatus === 0) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Sin Validar</span>
    }
    return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Finalizado</span>
  }

  const resetPage = () => setCurrentPage(1)

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    resetPage()
  }

  const handleStatusChange = (value: StatusFilter) => {
    setStatusFilter(value)
    resetPage()
  }

  const handleSortChange = (value: 'recent' | 'oldest') => {
    setSortOrder(value)
    resetPage()
  }

  const handleCenterChange = (value: string) => {
    setCenterFilter(value)
    resetPage()
  }

  const handleDateFromChange = (value: string) => {
    setDateFrom(value)
    resetPage()
  }

  const handleDateToChange = (value: string) => {
    setDateTo(value)
    resetPage()
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setSortOrder('recent')
    setDateFrom('')
    setDateTo('')
    setCenterFilter('')
    setCurrentPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(totalConteos / itemsPerPage))
  const indexOfFirstItem = totalConteos === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalConteos)
  const currentConteos = conteos

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getPaginationRange = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('¿Eliminar este conteo? Esta acción no se puede deshacer.')
    if (!confirmed) return
    try {
      await conteosAPI.deleteConteo(id)
      if (conteos.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      } else {
        void loadConteos()
      }
      alert('Conteo eliminado correctamente')
    } catch (error) {
      console.error('Error deleting conteo:', error)
      alert('No se pudo eliminar el conteo. Revisa tus permisos o intenta de nuevo.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Todos los Conteos</h1>
              <p className="mt-1 text-sm sm:text-base text-gray-600">
                {totalConteos === 0
                  ? '0 conteos encontrados'
                  : `Mostrando ${indexOfFirstItem}-${indexOfLastItem} de ${totalConteos} conteos`}
                {loadingPage && <span className="ml-2 text-gray-400">(cargando…)</span>}
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full sm:w-auto px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FiFilter className="w-5 h-5 mr-2" />
              Filtros
            </h2>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="ID, Centro o Usuario..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="sin_validar">Sin Validar</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orden
              </label>
              <select
                value={sortOrder}
                onChange={(e) => handleSortChange(e.target.value as 'recent' | 'oldest')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="recent">Más recientes primero</option>
                <option value="oldest">Más antiguos primero</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Centro
              </label>
              <input
                type="text"
                value={centerFilter}
                onChange={(e) => handleCenterChange(e.target.value)}
                placeholder="Filtrar por centro"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="md:hidden p-4 space-y-3">
            {currentConteos.map((conteo: ConteoListResponse) => (
              <div key={conteo.idConteo} className="border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Conteo</p>
                    <p className="text-lg font-semibold text-gray-900">#{conteo.idConteo}</p>
                  </div>
                  {getStatusBadge(conteo.Envio, conteo.Estatus)}
                </div>

                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <div className="flex items-center">
                    <FiPackage className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{formatSucursal(conteo.IdCentro)}</span>
                  </div>
                  <div className="flex items-center">
                    <FiUser className="w-4 h-4 mr-2 text-gray-400" />
                    <span>Realizó: {formatUsuario(conteo.IdUsuario)}</span>
                  </div>
                  <div className="flex items-center">
                    <FiCalendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{formatShortDate(conteo.Fechal)}</span>
                  </div>
                  <p className="text-gray-600">Productos: {conteo.total_productos ?? 0}</p>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => router.push(`/conteos/ver/${conteo.idConteo}`)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    <FiEye className="w-4 h-4 mr-1.5" /> Ver
                  </button>
                  {conteo.Envio === 0 && user && NIVELES_EDITAR.has(user.NivelUsuario) && (
                    <button
                      onClick={() => router.push(`/conteos/editar/${conteo.idConteo}`)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100"
                    >
                      <FiEdit className="w-4 h-4 mr-1.5" /> Editar
                    </button>
                  )}
                  {user && NIVELES_ELIMINAR.has(user.NivelUsuario) && (
                    <button
                      onClick={() => handleDelete(conteo.idConteo)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
                    >
                      <FiTrash className="w-4 h-4 mr-1.5" /> Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[1040px] divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 min-w-[90px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 min-w-[220px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Centro
                  </th>
                  <th className="px-6 py-3 min-w-[240px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Realizó
                  </th>
                  <th className="px-6 py-3 min-w-[140px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 min-w-[140px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 min-w-[120px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-6 py-3 min-w-[120px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentConteos.map((conteo: ConteoListResponse) => (
                  <tr key={conteo.idConteo} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{conteo.idConteo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <FiPackage className="w-4 h-4 mr-2 text-gray-400" />
                        {formatSucursal(conteo.IdCentro)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <FiUser className="w-4 h-4 mr-2 text-gray-400" />
                        {formatUsuario(conteo.IdUsuario)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <FiCalendar className="w-4 h-4 mr-2 text-gray-400" />
                        {formatShortDate(conteo.Fechal)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(conteo.Envio, conteo.Estatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {conteo.total_productos ?? 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => router.push(`/conteos/ver/${conteo.idConteo}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <FiEye className="w-5 h-5" />
                        </button>
                        {conteo.Envio === 0 && user && NIVELES_EDITAR.has(user.NivelUsuario) && (
                          <button
                            onClick={() => router.push(`/conteos/editar/${conteo.idConteo}`)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Editar"
                          >
                            <FiEdit className="w-5 h-5" />
                          </button>
                        )}
                        {conteo.Envio === 1 && user && NIVELES_ASIGNAR.has(user.NivelUsuario) && (
                          <button
                            onClick={async () => {
                              try {
                                const confirmed = window.confirm('¿Reasignar este conteo a su sucursal original y reiniciar existencias a cero?')
                                if (!confirmed) return
                                const nuevo = await conteosAPI.reasignarConteo(conteo.idConteo)
                                router.push(`/conteos/editar/${nuevo.idConteo}`)
                              } catch (err) {
                                console.error('Error reasignando conteo:', err)
                                alert('No se pudo reasignar el conteo. Revisa permisos o intenta de nuevo.')
                              }
                            }}
                            className="text-teal-600 hover:text-teal-900"
                            title="Reasignar"
                          >
                            <FiPackage className="w-5 h-5" />
                          </button>
                        )}
                        {user && NIVELES_ELIMINAR.has(user.NivelUsuario) && (
                          <button
                            onClick={() => handleDelete(conteo.idConteo)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <FiTrash className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalConteos === 0 && !loadingPage && (
              <div className="text-center py-12">
                <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No se encontraron conteos</p>
                <p className="text-gray-400 text-sm mt-2">
                  Intenta ajustar los filtros o buscar con otros términos
                </p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Anterior
                </button>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Siguiente
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Página <span className="font-medium">{currentPage}</span> de{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <span className="sr-only">Anterior</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {getPaginationRange().map((page, index) => (
                      page === '...' ? (
                        <span
                          key={`dots-${index}`}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => goToPage(Number(page))}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    ))}

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <span className="sr-only">Siguiente</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

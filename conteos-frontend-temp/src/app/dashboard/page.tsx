'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlus, FiUser, FiEdit, FiClipboard, FiBarChart, FiUsers, FiPackage, FiLogOut, FiCalendar } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { conteosAPI } from '@/lib/api'
import { ConteoResponse } from '@/types/api'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  
  const [stats, setStats] = useState({
    totalConteos: 0,
    conteosPendientes: 0,
    conteosAsignados: 0,
    conteosCompletados: 0
  })
  const [recentConteos, setRecentConteos] = useState<ConteoResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      const conteos = await conteosAPI.getConteos()
      // Calcular estadísticas
      const totalConteos = conteos.length
      const conteosPendientes = conteos.filter((c: any) => c.Envio === 0).length
      const conteosFinalizados = conteos.filter((c: any) => c.Envio === 1).length
      const conteosCompletados = conteosFinalizados
      setStats({
        totalConteos,
        conteosPendientes,
        conteosAsignados: conteosFinalizados,
        conteosCompletados
      })
      // Obtener detalles completos de los últimos 5 conteos
      const recientes = conteos.slice(0, 5)
      const recientesConDetalles = await Promise.all(
        recientes.map(async (c: any) => {
          try {
            const completo = await conteosAPI.getConteo(c.idConteo)
            return completo
          } catch {
            return c
          }
        })
      )
      setRecentConteos(recientesConDetalles)
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

  // Función para obtener rol por nivel de usuario
  const getRoleByLevel = (nivel: number): string => {
    switch(nivel) {
      case 1: return 'administrador'
      case 2: return 'supervisor'
      case 3: return 'cca'
      case 4: return 'app'
      default: return 'unknown'
    }
  }

  const userRole = user ? getRoleByLevel(user.NivelUsuario) : null
  const canCreateConteo = user && ['administrador', 'supervisor', 'cca', 'app'].includes(userRole || '')
  const canAssignConteo = user && ['administrador', 'supervisor', 'cca'].includes(userRole || '')
  const canEditConteo = user && ['administrador', 'supervisor'].includes(userRole || '')
  const canAnswerConteo = true // Todos los usuarios pueden contestar conteos asignados

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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-gray-600">
                Bienvenido, {user?.NombreUsuario} ({userRole})
              </p>
            </div>
            <button
              onClick={logout}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiLogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiBarChart className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Conteos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalConteos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiPackage className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.conteosPendientes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiUsers className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Asignados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.conteosAsignados}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiClipboard className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.conteosCompletados}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {canCreateConteo && (
              <button
                onClick={() => router.push('/conteos/crear')}
                className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiPlus className="w-5 h-5 mr-2" />
                Crear Conteo
              </button>
            )}
            
            {canAssignConteo && (
              <button
                onClick={() => router.push('/conteos/asignar')}
                className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FiUser className="w-5 h-5 mr-2" />
                Asignar Conteo
              </button>
            )}
            
            {canAnswerConteo && (
              <button
                onClick={() => router.push('/conteos/contestar')}
                className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <FiClipboard className="w-5 h-5 mr-2" />
                Contestar Conteos
              </button>
            )}
            
            {canEditConteo && stats.conteosPendientes > 0 && (
              <button
                onClick={() => {
                  // Navegar a lista de conteos pendientes para editar
                  const firstPending = recentConteos.find(c => c.Envio === 0)
                  if (firstPending) {
                    router.push(`/conteos/editar/${firstPending.idConteo}`)
                  }
                }}
                className="flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <FiEdit className="w-5 h-5 mr-2" />
                Editar Conteo
              </button>
            )}
          </div>
        </div>

        {/* Recent Conteos Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Conteos Recientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Centro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario Asignado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentConteos.map((conteo: any) => (
                  <tr key={conteo.idConteo} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{conteo.idConteo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {conteo.IdCentro}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {conteo.IdUsuario}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <FiCalendar className="w-4 h-4 mr-2 text-gray-400" />
                        {new Date(conteo.Fechal).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(conteo.Envio)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {conteo.detalles?.length || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {recentConteos.length === 0 && (
              <div className="text-center py-8">
                <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay conteos registrados</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiCalendar, FiUser, FiArrowLeft, FiSave } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { conteosAPI } from '@/lib/api'
import { ConteoResponse, ConteoListResponse, User, Usuario } from '@/types/api'

export default function AsignarConteo() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [sucursales, setSucursales] = useState<{ IdCentro: string; Sucursales: string }[]>([])
  const [formData, setFormData] = useState({
    IdCentro: '',
    productos: [{ CodigoBarras: '', NSistema: 0 }],
    IdUser: '',
    FechaAsignacion: ''
  })
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoadingData(true)
      const usuariosResponse = await conteosAPI.getUsuarios()
  setUsuarios(usuariosResponse)
  const sucursalesResponse = await conteosAPI.getSucursales()
  setSucursales(sucursalesResponse)
    } catch (error: any) {
      setError('Error al cargar los datos')
      console.error(error)
    } finally {
      setLoadingData(false)
    }
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const detalles = formData.productos.map(p => ({
        CodigoBarras: p.CodigoBarras,
        NSistema: p.NSistema,
        NExcistencia: 0
      }))
      const datosAsignacion = {
        IdCentro: formData.IdCentro,
        Fechal: formData.FechaAsignacion,
        IdUsuario: parseInt(formData.IdUser),
        detalles
      }
      await conteosAPI.asignarConteo(datosAsignacion)
      router.push('/dashboard')
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error al asignar el conteo')
    } finally {
      setLoading(false)
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

  // Verificar permisos
  const userRole = user ? getRoleByLevel(user.NivelUsuario) : null
  if (!user || !['administrador', 'supervisor', 'cca'].includes(userRole || '')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Acceso Denegado</h1>
          <p className="text-gray-600 mt-2">No tienes permisos para asignar conteos</p>
        </div>
      </div>
    )
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Asignar Conteo</h1>
          <p className="mt-2 text-gray-600">
            Crea y asigna un nuevo conteo a un usuario
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sucursal */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sucursal
            </label>
            <select
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.IdCentro}
              onChange={e => setFormData({ ...formData, IdCentro: e.target.value })}
            >
              <option value="">Seleccionar sucursal...</option>
              {sucursales.map(suc => (
                <option key={suc.IdCentro} value={suc.IdCentro}>{suc.Sucursales} ({suc.IdCentro})</option>
              ))}
            </select>
          </div>

          {/* Productos */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Productos a contar
            </label>
            {formData.productos.map((prod, idx) => (
              <div key={idx} className="flex space-x-2 mb-2">
                <input
                  type="text"
                  required
                  placeholder="Código de Barras"
                  className="w-2/3 px-3 py-2 border border-gray-300 rounded-lg"
                  value={prod.CodigoBarras}
                  onChange={e => {
                    const productos = [...formData.productos]
                    productos[idx].CodigoBarras = e.target.value
                    setFormData({ ...formData, productos })
                  }}
                />
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="Existencia sistema"
                  className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg"
                  value={prod.NSistema}
                  onChange={e => {
                    const productos = [...formData.productos]
                    productos[idx].NSistema = Number(e.target.value)
                    setFormData({ ...formData, productos })
                  }}
                />
                <button
                  type="button"
                  className="px-2 py-1 text-red-600"
                  onClick={() => {
                    const productos = formData.productos.filter((_, i) => i !== idx)
                    setFormData({ ...formData, productos: productos.length ? productos : [{ CodigoBarras: '', NSistema: 0 }] })
                  }}
                >Eliminar</button>
              </div>
            ))}
            <button
              type="button"
              className="mt-2 px-4 py-2 bg-gray-200 rounded"
              onClick={() => setFormData({ ...formData, productos: [...formData.productos, { CodigoBarras: '', NSistema: 0 }] })}
            >Agregar producto</button>
          </div>

          {/* Usuario y fecha */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiUser className="inline w-4 h-4 mr-1" />
                  Asignar a Usuario
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.IdUser}
                  onChange={e => setFormData({ ...formData, IdUser: e.target.value })}
                >
                  <option value="">Seleccionar usuario...</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.IdUsuarios} value={usuario.IdUsuarios}>
                      {usuario.NombreUsuario} (Nivel: {usuario.NivelUsuario})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiCalendar className="inline w-4 h-4 mr-1" />
                  Fecha de Asignación
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.FechaAsignacion}
                  onChange={e => setFormData({ ...formData, FechaAsignacion: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !formData.IdCentro || !formData.IdUser || !formData.FechaAsignacion || formData.productos.some(p => !p.CodigoBarras)}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <FiSave className="w-4 h-4 mr-2" />
              )}
              Asignar Conteo
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

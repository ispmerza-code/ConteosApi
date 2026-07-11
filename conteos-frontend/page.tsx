'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FiPlus, FiTrash2, FiSave, FiArrowLeft, FiEdit } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { conteosAPI } from '@/lib/api'
import { ConteoResponse, ConteoDetalle } from '@/types/api'

export default function EditarConteo() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const conteoId = parseInt(params.id as string)
  
  const [conteo, setConteo] = useState<ConteoResponse | null>(null)
  const [formData, setFormData] = useState({
    IdCentro: '',
    detalles: [] as ConteoDetalle[]
  })
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadConteo()
  }, [conteoId])

  const loadConteo = async () => {
    try {
      setLoadingData(true)
      const conteoData = await conteosAPI.getConteo(conteoId)
      
      // Verificar que el conteo esté pendiente
      if (conteoData.Envio !== 0) {
        setError('Solo se pueden editar conteos pendientes')
        return
      }
      
      setConteo(conteoData)
      setFormData({
        IdCentro: conteoData.IdCentro,
        detalles: conteoData.detalles || []
      })
    } catch (error: any) {
      setError('Error al cargar el conteo')
      console.error(error)
    } finally {
      setLoadingData(false)
    }
  }

  const addProducto = () => {
    setFormData({
      ...formData,
      detalles: [...formData.detalles, { CodigoBarras: '', NSistema: 0, NExcistencia: 0 }]
    })
  }

  const removeProducto = (index: number) => {
    const newDetalles = formData.detalles.filter((_, i) => i !== index)
    setFormData({ ...formData, detalles: newDetalles })
  }

  const updateProducto = (index: number, field: keyof ConteoDetalle, value: string | number) => {
    const newDetalles = [...formData.detalles]
    newDetalles[index] = { ...newDetalles[index], [field]: value }
    setFormData({ ...formData, detalles: newDetalles })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await conteosAPI.updateConteo(conteoId, formData)
      router.push('/dashboard')
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error al actualizar el conteo')
    } finally {
      setLoading(false)
    }
  }

  // Verificar permisos
  if (!user || !['administrador', 'supervisor'].includes(user.Rol)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Acceso Denegado</h1>
          <p className="text-gray-600 mt-2">No tienes permisos para editar conteos</p>
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

  if (error && !conteo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Error</h1>
          <p className="text-gray-600 mt-2">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FiEdit className="w-8 h-8 mr-3" />
            Editar Conteo #{conteoId}
          </h1>
          <p className="mt-2 text-gray-600">
            Modifica la información del conteo pendiente
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID Centro/Sucursal
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ej. T246"
                  value={formData.IdCentro}
                  onChange={(e) => setFormData({ ...formData, IdCentro: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuario Creador
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  value={conteo?.IdUser || ''}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Creación
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  value={conteo ? new Date(conteo.FechaCreacion).toLocaleDateString() : ''}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <span className="inline-flex px-3 py-2 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  Pendiente
                </span>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Productos a Contar</h2>
              <button
                type="button"
                onClick={addProducto}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                Agregar Producto
              </button>
            </div>

            <div className="space-y-4">
              {formData.detalles.map((detalle, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Código de Barras
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="7501000153282"
                        value={detalle.CodigoBarras}
                        onChange={(e) => updateProducto(index, 'CodigoBarras', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Existencias Sistema
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                        value={detalle.NSistema}
                        onChange={(e) => updateProducto(index, 'NSistema', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Existencias Físicas
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                        value={detalle.NExcistencia}
                        onChange={(e) => updateProducto(index, 'NExcistencia', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    
                    <div className="flex items-end">
                      {formData.detalles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProducto(index)}
                          className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
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
              disabled={loading}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <FiSave className="w-4 h-4 mr-2" />
              )}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

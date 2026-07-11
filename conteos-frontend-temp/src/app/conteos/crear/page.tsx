'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlus, FiTrash2, FiSave, FiArrowLeft } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { conteosAPI } from '@/lib/api'
import { ConteoDetalle } from '@/types/api'

export default function CrearConteo() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    IdCentro: '',
    detalles: [{ CodigoBarras: '', NSistema: 0, NExcistencia: 0 }] as ConteoDetalle[]
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      await conteosAPI.createConteo(formData)
      router.push('/dashboard')
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error al crear el conteo')
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Crear Conteo</h1>
          <p className="mt-2 text-gray-600">
            Registra un nuevo conteo de productos para la sucursal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

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
                  Usuario
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  value={user?.NombreUsuario || ''}
                />
              </div>
            </div>
          </div>

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
              Crear Conteo
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

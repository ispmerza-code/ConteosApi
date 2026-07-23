'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FiArrowLeft, FiSave, FiAlertCircle, FiPackage, FiEdit3 } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { conteosAPI } from '@/lib/api'
import { formatShortDate } from '@/lib/dateUtils'
import { NIVELES_EDITAR } from '@/lib/roles'

interface ConteoDetalle {
  idConteoDetalles: number
  CodigoBarras: string
  NSistema: number
  NExcistencia: number
  Precio: number
  Producto?: string
}

interface Conteo {
  idConteo: number
  Fechal: string
  Envio: number
  IdRealizo: number
  IdCentro: string
  IdUsuario: number
  detalles: ConteoDetalle[]
}

export default function EditarConteoPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const conteoId = parseInt(params.id as string)
  
  const [conteo, setConteo] = useState<Conteo | null>(null)
  const [sucursalesMap, setSucursalesMap] = useState<Record<string, string>>({})
  const [detalles, setDetalles] = useState<ConteoDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadConteo()
  }, [conteoId])

  const loadConteo = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user || !NIVELES_EDITAR.has(user.NivelUsuario)) {
        router.replace('/conteos')
        return
      }

      const data = await conteosAPI.getConteo(conteoId)
      
      // Verificar que el conteo esté pendiente (Envio = 0)
      if (data.Envio !== 0) {
        setError('Solo se pueden editar conteos pendientes')
        return
      }
      
      setConteo(data)
      setDetalles(data.detalles || [])

      try {
        const sucursales = await conteosAPI.getSucursales()
        const sucursalesLookup = sucursales.reduce((acc: Record<string, string>, suc: { IdCentro: string; Sucursales: string }) => {
          acc[suc.IdCentro] = suc.Sucursales
          return acc
        }, {})
        setSucursalesMap(sucursalesLookup)
      } catch {
        setSucursalesMap({})
      }
    } catch (error: any) {
      console.error('Error loading conteo:', error)
      setError(error.response?.data?.detail || 'Error al cargar el conteo')
    } finally {
      setLoading(false)
    }
  }

  const handleNSistemaChange = (idConteoDetalles: number, newValue: string) => {
    const value = parseFloat(newValue)
    if (isNaN(value) || value < 0) return
    
    setDetalles(detalles.map(d => 
      d.idConteoDetalles === idConteoDetalles 
        ? { ...d, NSistema: value }
        : d
    ))
  }

  const handleNExcistenciaChange = (idConteoDetalles: number, newValue: string) => {
    const value = parseFloat(newValue)
    if (isNaN(value) || value < 0) return

    setDetalles(detalles.map(d =>
      d.idConteoDetalles === idConteoDetalles
        ? { ...d, NExcistencia: value }
        : d
    ))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      
      // Preparar datos para enviar - solo actualizar NSistema
      const detallesActualizados = detalles.map(d => ({
        CodigoBarras: d.CodigoBarras,
        NSistema: d.NSistema,
        NExcistencia: d.NExcistencia,
        Precio: d.Precio
      }))
      
      await conteosAPI.editarConteo(conteoId, {
        detalles: detallesActualizados
      })
      
      alert('Conteo actualizado exitosamente')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error saving conteo:', error)
      const errorMsg = error.response?.data?.detail || 'Error al guardar los cambios'
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg))
    } finally {
      setSaving(false)
    }
  }

  const filteredDetalles = detalles.filter(d =>
    d.CodigoBarras.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !conteo) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft className="w-5 h-5 mr-2" />
            Volver al Dashboard
          </button>
          
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center">
              <FiAlertCircle className="w-6 h-6 text-red-600 mr-3" />
              <div>
                <h2 className="text-lg font-semibold text-red-900">Error</h2>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft className="w-5 h-5 mr-2" />
            Volver al Dashboard
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FiEdit3 className="w-8 h-8 text-orange-600" />
                Editar Conteo #{conteoId}
              </h1>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <strong className="mr-1">Centro:</strong> {conteo ? `${conteo.IdCentro}${sucursalesMap[conteo.IdCentro] ? ` - ${sucursalesMap[conteo.IdCentro]}` : ''}` : ''}
                </span>
                <span className="flex items-center">
                  <strong className="mr-1">Fecha:</strong> {conteo ? formatShortDate(conteo.Fechal) : ''}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Pendiente
                </span>
              </div>
            </div>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              <FiSave className="w-5 h-5 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <FiAlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Info box */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <FiAlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Instrucciones:</p>
              <p className="mt-1">
                Puedes editar las <strong>existencias en sistema (N° Sistema)</strong> de los productos. Las existencias físicas son de solo lectura.
              </p>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <input
            type="text"
            placeholder="Buscar por código de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Products table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FiPackage className="w-5 h-5 mr-2" />
              Productos del Conteo ({filteredDetalles.length})
            </h2>
          </div>
          
          <div className="md:hidden p-4 space-y-3">
            {filteredDetalles.map((detalle) => {
              const diferencia = detalle.NExcistencia - detalle.NSistema

              return (
                <div key={detalle.idConteoDetalles} className="border border-gray-200 rounded-lg p-4 shadow-sm">
                  <p className="text-sm font-semibold text-gray-900">{detalle.Producto || 'Desconocido'}</p>
                  <p className="text-xs text-gray-500 mt-1">Código: {detalle.CodigoBarras}</p>

                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
                    <label className="block">
                      <span className="text-gray-600 text-xs">N° Sistema (Editable)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                          value={detalle.NSistema}
                          onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                          onChange={(e) => handleNSistemaChange(detalle.idConteoDetalles, e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-yellow-50 font-medium"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block">
                          <span className="text-gray-600 text-xs">N° Física</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={detalle.NExcistencia}
                            onChange={(e) => handleNExcistenciaChange(detalle.idConteoDetalles, e.target.value)}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-medium"
                          />
                        </label>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Precio</p>
                        <p className="font-medium text-gray-900">${detalle.Precio.toFixed(2)}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 mb-1">Diferencia</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        diferencia === 0
                          ? 'bg-green-100 text-green-800'
                          : diferencia > 0
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código de Barras
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° Sistema (Editable)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° Existencia Física
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diferencia
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDetalles.map((detalle) => {
                  const diferencia = detalle.NExcistencia - detalle.NSistema
                  return (
                    <tr key={detalle.idConteoDetalles} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {detalle.Producto || 'Desconocido'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {detalle.CodigoBarras}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={detalle.NSistema}
                          onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                          onChange={(e) => handleNSistemaChange(detalle.idConteoDetalles, e.target.value)}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-yellow-50 font-medium"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {detalle.NExcistencia}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${detalle.Precio.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          diferencia === 0 
                            ? 'bg-green-100 text-green-800' 
                            : diferencia > 0 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredDetalles.length === 0 && (
            <div className="text-center py-12">
              <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No se encontraron productos</p>
              <p className="text-sm text-gray-400 mt-1">Intenta con otro código de barras</p>
            </div>
          )}
        </div>

        {/* Summary */}
        {detalles.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Productos</p>
                <p className="text-2xl font-bold text-gray-900">{detalles.length}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600">Total Sistema</p>
                <p className="text-2xl font-bold text-blue-900">
                  {detalles.reduce((sum, d) => sum + d.NSistema, 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600">Total Físico</p>
                <p className="text-2xl font-bold text-green-900">
                  {detalles.reduce((sum, d) => sum + d.NExcistencia, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
          >
            <FiSave className="w-5 h-5 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiClipboard, FiArrowLeft, FiSave, FiUser, FiCalendar, FiPackage } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { conteosAPI } from '@/lib/api'
import { ConteoResponse, ConteoDetalle } from '@/types/api'

export default function ContestarConteos() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [conteosAsignados, setConteosAsignados] = useState<ConteoResponse[]>([])
  const [selectedConteo, setSelectedConteo] = useState<ConteoResponse | null>(null)
  const [respuestas, setRespuestas] = useState<{ [key: string]: number }>({})
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadConteosAsignados()
  }, [])

  const loadConteosAsignados = async () => {
    try {
      setLoadingData(true)
      const conteos = await conteosAPI.getConteos()
      // Filtrar conteos pendientes asignados al usuario actual (Envio = 0)
      const asignados = conteos.filter((conteo: ConteoResponse) => 
        conteo.Envio === 0 && conteo.IdUsuario === user?.IdUsuarios
      )
      setConteosAsignados(asignados)
    } catch (error: any) {
      setError('Error al cargar los conteos asignados')
    } finally {
      setLoadingData(false)
    }
  }

  const selectConteo = (conteo: ConteoResponse) => {
    // Cargar detalles completos del conteo desde el backend
    setLoading(true)
    conteosAPI.getConteo(conteo.idConteo)
      .then((conteoCompleto) => {
        setSelectedConteo(conteoCompleto)
        // Inicializar respuestas con las existencias actuales
        const initialRespuestas: { [key: string]: number } = {}
        conteoCompleto.detalles?.forEach((detalle: any, index: number) => {
          initialRespuestas[`${index}_${detalle.CodigoBarras}`] = detalle.NExcistencia || 0
        })
        setRespuestas(initialRespuestas)
      })
      .catch(() => {
        setError('No se pudieron cargar los detalles del conteo')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const updateRespuesta = (index: number, codigoBarras: string, valor: number) => {
    setRespuestas({
      ...respuestas,
      [`${index}_${codigoBarras}`]: valor
    })
  }

  const handleSubmitConteo = async () => {
    if (!selectedConteo) return

    setLoading(true)
    setError('')

    try {
      // Construir los datos actualizados
      const detallesActualizados = selectedConteo.detalles?.map((detalle, index) => ({
        ...detalle,
        NExcistencia: respuestas[`${index}_${detalle.CodigoBarras}`] || 0
      }))

      const datosActualizados = {
        IdCentro: selectedConteo.IdCentro,
        detalles: detallesActualizados || []
      }

  // Contestar conteo y marcarlo como completado
  await conteosAPI.contestarConteo(selectedConteo.idConteo, { detalles: detallesActualizados })
      
      // Recargar lista
      await loadConteosAsignados()
      setSelectedConteo(null)
      setRespuestas({})
      
    } catch (error: any) {
      // Si el backend regresa un array de errores, mostrarlo
      if (error.response?.data?.detail) {
        setError(error.response.data.detail)
      } else if (Array.isArray(error.response?.data)) {
        setError(error.response.data)
      } else {
        setError('Error al enviar el conteo')
      }
    } finally {
      setLoading(false)
    }
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <FiClipboard className="w-8 h-8 mr-3" />
            Contestar Conteos Asignados
          </h1>
          <p className="mt-2 text-gray-600">
            Completa los conteos que te han sido asignados
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            {Array.isArray(error) ? (
              <ul className="text-red-700 list-disc pl-5">
                {error.map((err: any, idx: number) => (
                  <li key={idx}>{err.msg || JSON.stringify(err)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-red-700">{typeof error === 'object' ? JSON.stringify(error) : error}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de Conteos Asignados */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Conteos Asignados ({conteosAsignados.length})
            </h2>
            
            {conteosAsignados.length === 0 ? (
              <div className="text-center py-8">
                <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No tienes conteos asignados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {conteosAsignados.map((conteo) => (
                  <div
                    key={conteo.idConteo}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedConteo?.idConteo === conteo.idConteo
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => selectConteo(conteo)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Conteo #{conteo.idConteo}
                        </h3>
                        <p className="text-sm text-gray-600 flex items-center mt-1">
                          <FiUser className="w-4 h-4 mr-1" />
                          Centro: {conteo.IdCentro}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center mt-1">
                          <FiCalendar className="w-4 h-4 mr-1" />
                          Asignado: {conteo.Fechal ? new Date(conteo.Fechal).toLocaleDateString() : 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Productos: {conteo.detalles?.length || 0}
                        </p>
                      </div>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                        Asignado
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulario de Conteo */}
          <div className="bg-white rounded-lg shadow p-6">
            {!selectedConteo ? (
              <div className="text-center py-8">
                <FiClipboard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Selecciona un conteo para completar</p>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Conteo #{selectedConteo.idConteo} - {selectedConteo.IdCentro}
                </h2>
                <div className="space-y-4 mb-6">
                  {selectedConteo.detalles?.map((detalle, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Código de Barras
                          </label>
                          <input
                            type="text"
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                            value={detalle.CodigoBarras}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Existencias Sistema
                            </label>
                            <input
                              type="number"
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                              value={detalle.NSistema}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Existencias Físicas *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              value={respuestas[`${index}_${detalle.CodigoBarras}`] || 0}
                              onChange={(e) => updateRespuesta(index, detalle.CodigoBarras, parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        {/* Mostrar diferencia */}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Diferencia:</span>
                            <span className={`font-medium ${
                              (respuestas[`${index}_${detalle.CodigoBarras}`] || 0) - detalle.NSistema === 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {(respuestas[`${index}_${detalle.CodigoBarras}`] || 0) - detalle.NSistema}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmitConteo}
                    disabled={loading}
                    className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <FiSave className="w-4 h-4 mr-2" />
                    )}
                    Completar Conteo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FiArrowLeft, FiPackage, FiUser, FiCalendar, FiShoppingBag, FiCheckCircle, FiClock, FiDollarSign, FiSend, FiAlertCircle, FiShield } from 'react-icons/fi'
import { conteosAPI } from '@/lib/api'
import { ConteoResponse, User } from '@/types/api'
import { formatLocalDate } from '@/lib/dateUtils'
import { useAuth } from '@/context/AuthContext'

const NIVELES_CONTESTAR = new Set([1, 2, 4, 8])
const NIVELES_VALIDAR = new Set([1, 33, 7, 8])

export default function VerConteo() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { user } = useAuth()
  
  const [conteo, setConteo] = useState<ConteoResponse | null>(null)
  const [sucursalNombre, setSucursalNombre] = useState('')
  const [usuarioNombre, setUsuarioNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [excistencias, setExcistencias] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (id) {
      loadConteo()
    }
  }, [id])

  const loadConteo = async () => {
    try {
      setLoading(true)
      const data = await conteosAPI.getConteo(parseInt(id))
      setConteo(data)
      // Inicializar mapa de existencias editables
      const mapa: Record<string, number> = {}
      data.detalles?.forEach((d: any) => { mapa[d.CodigoBarras] = d.NExcistencia })
      setExcistencias(mapa)

      try {
        const [sucursales, usuarios] = await Promise.all([
          conteosAPI.getSucursales(),
          conteosAPI.getUsuarios()
        ])

        const sucursal = sucursales.find(
          (item: { IdCentro: string; Sucursales: string }) => item.IdCentro === data.IdCentro
        )

        const usuario = usuarios.find((item: User) => item.IdUsuarios === data.IdUsuario)

        setSucursalNombre(sucursal?.Sucursales || '')
        setUsuarioNombre(usuario?.NombreUsuario || '')
      } catch {
        setSucursalNombre('')
        setUsuarioNombre('')
      }
    } catch (error: any) {
      console.error('Error al cargar conteo:', error)
      setError('Error al cargar el conteo')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (envio: number, estatus?: number) => {
    if (envio === 0) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
          <FiClock className="w-4 h-4 mr-1" />
          Pendiente
        </span>
      )
    }
    if (envio === 1 && estatus === 0) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-800">
          <FiAlertCircle className="w-4 h-4 mr-1" />
          Sin Validar
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
        <FiCheckCircle className="w-4 h-4 mr-1" />
        Finalizado
      </span>
    )
  }

  const puedeContestar = user && NIVELES_CONTESTAR.has(user.NivelUsuario) && conteo?.Envio === 0 && !submitted
  const puedeValidar = user && NIVELES_VALIDAR.has(user.NivelUsuario) && conteo?.Envio === 1 && conteo?.Estatus === 0

  const handleEnviar = async () => {
    if (!conteo) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const detalles = conteo.detalles.map(d => ({
        CodigoBarras: d.CodigoBarras,
        NExcistencia: excistencias[d.CodigoBarras] ?? d.NExcistencia
      }))
      await conteosAPI.contestarConteo(conteo.idConteo, { detalles })
      setSubmitted(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || 'Error al enviar el conteo')
    } finally {
      setSubmitting(false)
    }
  }

  const calcularTotales = () => {
    if (!conteo?.detalles) return { totalProductos: 0, totalSistema: 0, totalFisico: 0, totalDiferencia: 0, totalValor: 0, valorFaltante: 0 }
    
    return conteo.detalles.reduce((acc, detalle) => {
      const fisico = excistencias[detalle.CodigoBarras] ?? detalle.NExcistencia
      const diferencia = fisico - detalle.NSistema
      const valorTotal = detalle.Precio * fisico
      const faltante = diferencia < 0 ? Math.abs(diferencia) * detalle.Precio : 0
      
      return {
        totalProductos: acc.totalProductos + 1,
        totalSistema: acc.totalSistema + detalle.NSistema,
        totalFisico: acc.totalFisico + fisico,
        totalDiferencia: acc.totalDiferencia + diferencia,
        totalValor: acc.totalValor + valorTotal,
        valorFaltante: acc.valorFaltante + faltante
      }
    }, { totalProductos: 0, totalSistema: 0, totalFisico: 0, totalDiferencia: 0, totalValor: 0, valorFaltante: 0 })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !conteo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'No se pudo cargar el conteo'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  const totales = calcularTotales()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Detalles del Conteo #{conteo.idConteo}</h1>
              <p className="mt-2 text-gray-600">
                Información completa del conteo y productos registrados
              </p>
            </div>
            {getStatusBadge(conteo.Envio, conteo.Estatus)}
          </div>
        </div>

        {/* Información General */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
            <h2 className="text-lg font-semibold text-gray-900">Información General</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiShoppingBag className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sucursal</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {conteo.IdCentro}{sucursalNombre ? ` - ${sucursalNombre}` : ''}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FiUser className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Realizó el conteo</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {usuarioNombre || (conteo.IdUsuario ? `Usuario #${conteo.IdUsuario}` : 'Sin registrar')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiCalendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatLocalDate(conteo.Fechal)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de Totales */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Productos</p>
                <p className="text-2xl font-bold text-gray-900">{totales.totalProductos}</p>
              </div>
              <FiPackage className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sistema</p>
                <p className="text-2xl font-bold text-gray-900">{totales.totalSistema.toFixed(2)}</p>
              </div>
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold">
                S
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Físico</p>
                <p className="text-2xl font-bold text-gray-900">{totales.totalFisico.toFixed(2)}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                F
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Diferencia Total</p>
                <p className={`text-2xl font-bold ${
                  totales.totalDiferencia === 0 ? 'text-green-600' :
                  totales.totalDiferencia > 0 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {totales.totalDiferencia > 0 ? '+' : ''}{totales.totalDiferencia.toFixed(2)}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                totales.totalDiferencia === 0 ? 'bg-green-100 text-green-600' :
                totales.totalDiferencia > 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
              }`}>
                Δ
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-green-600">${totales.totalValor.toFixed(2)}</p>
              </div>
              <FiDollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-red-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valor Faltante</p>
                <p className={`text-2xl font-bold ${totales.valorFaltante > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${totales.valorFaltante.toFixed(2)}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                totales.valorFaltante > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
              }`}>
                <FiDollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Productos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-green-200">
            <h2 className="text-lg font-semibold text-gray-900">Productos Contados</h2>
          </div>
          
          <div className="md:hidden p-4 space-y-3">
            {conteo.detalles?.map((detalle, index) => {
              const fisico = excistencias[detalle.CodigoBarras] ?? detalle.NExcistencia
              const diferencia = fisico - detalle.NSistema
              const valorTotal = detalle.Precio * fisico

              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-gray-900 leading-tight">{detalle.Producto}</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      diferencia === 0
                        ? 'bg-green-100 text-green-800'
                        : diferencia > 0
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-gray-700">
                    <p><span className="text-gray-500">#:</span> {index + 1}</p>
                    <p><span className="text-gray-500">Código:</span> {detalle.CodigoBarras}</p>
                    <p><span className="text-gray-500">Sistema:</span> {detalle.NSistema.toFixed(2)}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Físicas:</span>
                      {puedeContestar ? (
                        <input
                          type="number" inputMode="decimal" step="0.01" min="0"
                          className="w-24 border border-blue-300 rounded px-2 py-0.5 text-sm focus:ring-2 focus:ring-blue-500"
                          value={excistencias[detalle.CodigoBarras] ?? detalle.NExcistencia}
                          onFocus={e => e.target.select()}
                          onChange={e => setExcistencias(prev => ({ ...prev, [detalle.CodigoBarras]: parseFloat(e.target.value) || 0 }))}
                        />
                      ) : (
                        <span>{(excistencias[detalle.CodigoBarras] ?? detalle.NExcistencia).toFixed(2)}</span>
                      )}
                    </div>
                    <p><span className="text-gray-500">Precio:</span> ${detalle.Precio.toFixed(2)}</p>
                    <p className="font-semibold text-green-600">Valor total: ${valorTotal.toFixed(2)}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código de Barras
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Existencias Sistema
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Existencias Físicas
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diferencia
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Unitario
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {conteo.detalles?.map((detalle, index) => {
                  const fisico = excistencias[detalle.CodigoBarras] ?? detalle.NExcistencia
                  const diferencia = fisico - detalle.NSistema
                  const valorTotal = detalle.Precio * fisico
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {detalle.Producto}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                        {detalle.CodigoBarras}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                        {detalle.NSistema.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {puedeContestar ? (
                          <input
                            type="number" inputMode="decimal" step="0.01" min="0"
                            className="w-24 border border-blue-300 rounded-lg px-2 py-1 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={excistencias[detalle.CodigoBarras] ?? detalle.NExcistencia}
                            onFocus={e => e.target.select()}
                            onChange={e => setExcistencias(prev => ({ ...prev, [detalle.CodigoBarras]: parseFloat(e.target.value) || 0 }))}
                          />
                        ) : (
                          <span className="text-gray-700">{fisico.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          diferencia === 0
                            ? 'bg-green-100 text-green-800'
                            : diferencia > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                        ${detalle.Precio.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 text-right">
                        ${valorTotal.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-sm font-bold text-gray-900">
                    TOTALES
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    {totales.totalSistema.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    {totales.totalFisico.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      totales.totalDiferencia === 0
                        ? 'bg-green-100 text-green-800'
                        : totales.totalDiferencia > 0
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {totales.totalDiferencia > 0 ? '+' : ''}{totales.totalDiferencia.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    -
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">
                    ${totales.totalValor.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {(!conteo.detalles || conteo.detalles.length === 0) && (
            <div className="text-center py-12">
              <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No hay productos registrados</p>
              <p className="text-gray-400 text-sm mt-2">
                Este conteo no tiene productos asociados
              </p>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        {submitError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />{submitError}
          </div>
        )}
        {submitted && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-700">
            <FiCheckCircle className="w-4 h-4 flex-shrink-0" />Conteo enviado correctamente. Redirigiendo...
          </div>
        )}
        <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="w-full sm:w-auto px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Cerrar
          </button>
          {puedeContestar && (
            <button
              onClick={handleEnviar}
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <FiSend className="w-4 h-4" />
              {submitting ? 'Enviando...' : 'Enviar Conteo'}
            </button>
          )}
          {puedeValidar && (
            <button
              onClick={() => router.push(`/conteos/validar/${conteo.idConteo}`)}
              className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <FiShield className="w-4 h-4" />
              Validar Conteo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

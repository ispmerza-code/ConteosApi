'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FiArrowLeft, FiCheckCircle, FiAlertCircle, FiPackage, FiSave } from 'react-icons/fi'
import { conteosAPI } from '@/lib/api'
import { ConteoResponse } from '@/types/api'
import { formatLocalDate } from '@/lib/dateUtils'
import { useAuth } from '@/context/AuthContext'

const NIVELES_VALIDAR = new Set([1, 3, 7, 8])

export default function ValidarConteo() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { user } = useAuth()

  const [conteo, setConteo] = useState<ConteoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // NSistema per barcode
  const [nsistema, setNsistema] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!user) return
    if (!NIVELES_VALIDAR.has(user.NivelUsuario)) {
      router.replace('/dashboard')
      return
    }
    if (id) loadConteo()
  }, [id, user])

  const loadConteo = async () => {
    try {
      setLoading(true)
      const data = await conteosAPI.getConteo(parseInt(id))
      setConteo(data)
      const mapa: Record<string, number> = {}
      data.detalles?.forEach((d: any) => { mapa[d.CodigoBarras] = d.NSistema ?? 0 })
      setNsistema(mapa)
    } catch {
      setError('Error al cargar el conteo')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conteo) return

    setSubmitting(true)
    setSubmitError('')
    try {
      const detalles = conteo.detalles?.map((d: any) => ({
        CodigoBarras: d.CodigoBarras,
        NSistema: nsistema[d.CodigoBarras] ?? 0
      })) ?? []

      await conteosAPI.validarConteo(parseInt(id), detalles)
      setSubmitted(true)
      setTimeout(() => router.push('/conteos'), 2000)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setSubmitError(typeof detail === 'string' ? detail : 'Error al validar el conteo')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !conteo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 max-w-sm w-full text-center">
          <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-gray-700">{error || 'Conteo no encontrado'}</p>
          <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline">Volver</button>
        </div>
      </div>
    )
  }

  // Only allow validating sin-validar conteos (Envio=1, Estatus=0)
  if (conteo.Envio !== 1 || conteo.Estatus !== 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6 max-w-sm w-full text-center">
          <FiAlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-700">Este conteo no está disponible para validar.</p>
          <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline">Volver</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Validar Conteo #{id}</h1>
          <p className="mt-1 text-gray-600">Ingresa las existencias en sistema para cada producto y confirma la validación.</p>
        </div>

        {/* Info del conteo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block">Sucursal</span>
              <span className="font-medium text-gray-900">{conteo.NombreSucursal || conteo.IdCentro}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Fecha</span>
              <span className="font-medium text-gray-900">{formatLocalDate(conteo.Fechal)}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Productos</span>
              <span className="font-medium text-gray-900">{conteo.detalles?.length ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          {submitError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{submitError}</p>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-purple-200">
              <div className="flex items-center gap-3">
                <FiPackage className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">Existencias en Sistema</h2>
              </div>
            </div>

            {/* Mobile */}
            <div className="md:hidden p-4 space-y-3">
              {conteo.detalles?.map((d: any) => (
                <div key={d.CodigoBarras} className="border border-gray-200 rounded-lg p-4">
                  <p className="font-semibold text-gray-900 text-sm mb-1">{d.Producto || d.CodigoBarras}</p>
                  <p className="text-xs text-gray-500 mb-3">{d.CodigoBarras}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <span className="text-xs text-gray-500 block mb-1">Físico (capturado)</span>
                      <span className="font-medium text-gray-900">{(d.NExcistencia ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">Sistema <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                        value={nsistema[d.CodigoBarras] ?? ''}
                        onFocus={() => { if (nsistema[d.CodigoBarras] === 0) setNsistema(prev => { const n = {...prev}; delete n[d.CodigoBarras]; return n }) }}
                        onChange={(e) => setNsistema(prev => ({ ...prev, [d.CodigoBarras]: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Producto</th>
                    <th className="px-4 py-3 text-left font-medium">Código</th>
                    <th className="px-4 py-3 text-right font-medium">Precio</th>
                    <th className="px-4 py-3 text-right font-medium">Físico (capturado)</th>
                    <th className="px-4 py-3 text-right font-medium">Sistema <span className="text-red-500">*</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {conteo.detalles?.map((d: any) => (
                    <tr key={d.CodigoBarras} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.Producto || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{d.CodigoBarras}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">${(d.Precio ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{(d.NExcistencia ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm text-right"
                          value={nsistema[d.CodigoBarras] ?? ''}
                          onFocus={() => { if (nsistema[d.CodigoBarras] === 0) setNsistema(prev => { const n = {...prev}; delete n[d.CodigoBarras]; return n }) }}
                          onChange={(e) => setNsistema(prev => ({ ...prev, [d.CodigoBarras]: parseFloat(e.target.value) || 0 }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Toast */}
          {submitted && (
            <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center gap-3 sm:max-w-md">
              <FiCheckCircle className="w-6 h-6" />
              <div>
                <p className="font-semibold">¡Conteo finalizado!</p>
                <p className="text-sm text-green-100">Redirigiendo a la lista...</p>
              </div>
            </div>
          )}

          {/* Botones fijos */}
          <div className="fixed bottom-0 left-0 right-0 md:static bg-white border-t border-gray-200 px-4 py-4 md:py-0 md:border-0 md:mt-6 shadow-lg md:shadow-none">
            <div className="flex gap-3 max-w-4xl mx-auto">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 md:flex-none px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || submitted}
                className="flex-1 md:flex-none px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <FiSave className="w-5 h-5" />
                    Validar Conteo
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

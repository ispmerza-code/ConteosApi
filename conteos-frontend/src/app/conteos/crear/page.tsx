'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlus, FiTrash2, FiSave, FiArrowLeft, FiCamera, FiShoppingBag, FiUser, FiEdit2, FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { conteosAPI, catalogoAPI } from '@/lib/api'
import { ConteoDetalle, Sucursal } from '@/types/api'
import dynamic from 'next/dynamic'

const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false })

interface ProductoAgregado extends ConteoDetalle {
  id: string
  Producto?: string
}

export default function CrearConteo() {
  const { user, selectedSucursal } = useAuth()
  const router = useRouter()
  
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [formData, setFormData] = useState({
    IdCentro: selectedSucursal?.IdCentro || '',
  })
  const [productosAgregados, setProductosAgregados] = useState<ProductoAgregado[]>([])
  const [productoActual, setProductoActual] = useState({ CodigoBarras: '', NSistema: 0, NExcistencia: 0, Precio: 0 })
  const [loading, setLoading] = useState(false)
  const [loadingPrecio, setLoadingPrecio] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})
  const [showScanner, setShowScanner] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [precioAutoFill, setPrecioAutoFill] = useState(false)

  useEffect(() => {
    if (!user) return
    // Monitorista soporte (33): no crea desde esta pantalla (como el ex nivel 3)
    if (user.NivelUsuario === 33) {
      router.replace('/dashboard')
      return
    }
    if (user?.NivelUsuario === 4) {
      if (!selectedSucursal) {
        router.push('/seleccionar-sucursal')
        return
      }
      setFormData({ IdCentro: selectedSucursal.IdCentro })
    } else {
      loadSucursales()
    }
  }, [selectedSucursal, user])

  const loadSucursales = async () => {
    try {
      setLoadingData(true)
      const data = await conteosAPI.getSucursales()
      setSucursales(data)
    } catch {
      setError('Error al cargar las sucursales')
    } finally {
      setLoadingData(false)
    }
  }

  const isNivel4 = user?.NivelUsuario === 4

  const agregarProducto = async () => {
    const errors: { [key: string]: string } = {}
    
    if (!productoActual.CodigoBarras) {
      errors.CodigoBarras = 'Debes ingresar un código de barras'
    }
    if (!isNivel4 && productoActual.NSistema === 0) {
      errors.NSistema = 'Debes capturar las existencias en sistema'
    }
    if (productoActual.NExcistencia === 0) {
      errors.NExcistencia = 'Debes capturar las existencias físicas para continuar'
    }
    if (productoActual.Precio === 0) {
      errors.Precio = 'Debes ingresar el precio del producto'
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    
    try {
      // Obtener el nombre del producto desde el código de barras
      let nombreProducto: string
      try {
        const producto = await catalogoAPI.getProducto(productoActual.CodigoBarras)
        nombreProducto = producto.Producto
      } catch (err) {
        setFieldErrors({ CodigoBarras: `Código de barras "${productoActual.CodigoBarras}" no existe en el catálogo` })
        return
      }
      
      const nuevoProducto: ProductoAgregado = {
        ...productoActual,
        id: Date.now().toString(),
        Producto: nombreProducto
      }
      
      setProductosAgregados([...productosAgregados, nuevoProducto])
      setProductoActual({ CodigoBarras: '', NSistema: 0, NExcistencia: 0, Precio: 0 })
      setFieldErrors({})
    } catch (err) {
      console.error('Error al agregar producto:', err)
      setError('Error al agregar el producto')
    }
  }

  const eliminarProducto = (id: string) => {
    setProductosAgregados(productosAgregados.filter(p => p.id !== id))
  }

  const editarProducto = (id: string) => {
    const producto = productosAgregados.find(p => p.id === id)
    if (producto) {
      setProductoActual({ 
        CodigoBarras: producto.CodigoBarras, 
        NSistema: producto.NSistema, 
        NExcistencia: producto.NExcistencia,
        Precio: producto.Precio
      })
      eliminarProducto(id)
    }
  }

  const openScanner = () => {
    setShowScanner(true)
  }

  const fetchPrecio = async (barcode: string) => {
    if (!barcode) return
    setLoadingPrecio(true)
    setPrecioAutoFill(false)
    try {
      const precio = await catalogoAPI.getUltimoPrecio(barcode)
      if (precio !== null) {
        setProductoActual(prev => ({ ...prev, Precio: precio }))
        setPrecioAutoFill(true)
        setFieldErrors(prev => ({ ...prev, Precio: '' }))
      }
    } catch {
      // Sin precio previo, el usuario lo captura manualmente
    } finally {
      setLoadingPrecio(false)
    }
  }

  const handleScan = (barcode: string) => {
    setProductoActual(prev => ({ ...prev, CodigoBarras: barcode }))
    setShowScanner(false)
    setFieldErrors(prev => ({ ...prev, CodigoBarras: '' }))
    fetchPrecio(barcode)
  }

  const closeScanner = () => {
    setShowScanner(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.IdCentro) {
      setFieldErrors({ IdCentro: 'Debes seleccionar una sucursal' })
      return
    }
    
    if (productosAgregados.length === 0) {
      setError('Debes agregar al menos un producto al conteo')
      return
    }
    
    setLoading(true)
    setError('')

    try {
      const detalles = productosAgregados.map(p => ({
        CodigoBarras: p.CodigoBarras,
        NSistema: p.NSistema,
        NExcistencia: p.NExcistencia,
        Precio: p.Precio
      }))
      
      await conteosAPI.createConteo({ IdCentro: formData.IdCentro, detalles })
      
      setShowToast(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Error al crear conteo:', error)
      let errorMessage = 'Error al crear el conteo'
      
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail
            .map((err: any) => `${err.loc?.join(' → ') || 'Error'}: ${err.msg}`)
            .join(', ')
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (user?.NivelUsuario === 4 && !selectedSucursal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Crear Conteo</h1>
          <p className="mt-2 text-gray-600">
            {isNivel4
              ? 'Captura las existencias físicas — Monitorista Soporte validará las existencias en sistema'
              : 'Sigue los pasos para registrar un nuevo conteo de productos'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error global */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Paso 1: Información General */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Información General</h2>
                  <p className="text-sm text-gray-600">Selecciona la sucursal para comenzar</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FiShoppingBag className="w-4 h-4 text-gray-500" />
                    Sucursal
                  </label>
                  {user?.NivelUsuario === 4 && selectedSucursal ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="font-semibold text-blue-800">{selectedSucursal.Sucursales}</span>
                      <span className="text-sm text-blue-500">({selectedSucursal.IdCentro})</span>
                      <button
                        type="button"
                        onClick={() => router.push('/seleccionar-sucursal')}
                        className="ml-auto text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <select
                      required
                      disabled={loadingData}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                        fieldErrors.IdCentro ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      value={formData.IdCentro}
                      onChange={e => {
                        setFormData({ IdCentro: e.target.value })
                        setFieldErrors({ ...fieldErrors, IdCentro: '' })
                      }}
                    >
                      <option value="">{loadingData ? 'Cargando...' : 'Seleccionar sucursal...'}</option>
                      {sucursales.map(s => (
                        <option key={s.IdCentro} value={s.IdCentro}>{s.Sucursales} ({s.IdCentro})</option>
                      ))}
                    </select>
                  )}
                  {fieldErrors.IdCentro && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <FiAlertCircle className="w-3 h-3" />{fieldErrors.IdCentro}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FiUser className="w-4 h-4 text-gray-500" />
                    Usuario
                  </label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-gray-900 font-medium">{user?.NombreUsuario || ''}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Paso 2: Productos a Contar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Productos a Contar</h2>
                  <p className="text-sm text-gray-600">
                    {isNivel4 ? 'Captura solo existencias físicas (sistema se valida después)' : 'Escanea o agrega productos manualmente'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Formulario de captura */}
              <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                <div className="space-y-4">
                  {/* Código de Barras */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código de Barras <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          inputMode="numeric"

                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                            fieldErrors.CodigoBarras ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="Escanea o escribe el código de barras"
                          value={productoActual.CodigoBarras}
                          onChange={(e) => {
                            setProductoActual({ ...productoActual, CodigoBarras: e.target.value })
                            setFieldErrors({ ...fieldErrors, CodigoBarras: '' })
                            setPrecioAutoFill(false)
                          }}
                          onBlur={(e) => fetchPrecio(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={openScanner}
                        disabled={!formData.IdCentro}
                        className={`px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${
                          showScanner
                            ? 'bg-gray-600 hover:bg-gray-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed'
                        }`}
                        title={showScanner ? "Detener escaneo" : "Escanear código de barras"}
                      >
                        <FiCamera className="w-5 h-5" />
                        <span className="hidden sm:inline">{showScanner ? 'Detener' : 'Escanear'}</span>
                      </button>
                    </div>
                    {fieldErrors.CodigoBarras && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <FiAlertCircle className="w-3 h-3" />
                        {fieldErrors.CodigoBarras}
                      </p>
                    )}
                    {showScanner && (
                      <p className="mt-2 text-sm text-blue-600 flex items-center gap-1 animate-pulse">
                        <FiCamera className="w-3 h-3" />
                        Apunta la cámara al código de barras
                      </p>
                    )}
                  </div>
                  
                  {/* Existencias */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!isNivel4 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Existencias Sistema <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          fieldErrors.NSistema ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="0"
                        value={productoActual.NSistema || ''}
                        onChange={(e) => {
                          setProductoActual({ ...productoActual, NSistema: parseFloat(e.target.value) || 0 })
                          setFieldErrors({ ...fieldErrors, NSistema: '' })
                        }}
                      />
                      <p className="mt-1 text-xs text-gray-500">Según inventario actual</p>
                      {fieldErrors.NSistema && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <FiAlertCircle className="w-3 h-3" />
                          {fieldErrors.NSistema}
                        </p>
                      )}
                    </div>
                    )}
                    
                    <div className={isNivel4 ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Existencias Físicas <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          fieldErrors.NExcistencia ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="0"
                        value={productoActual.NExcistencia || ''}
                        onChange={(e) => {
                          setProductoActual({ ...productoActual, NExcistencia: parseFloat(e.target.value) || 0 })
                          setFieldErrors({ ...fieldErrors, NExcistencia: '' })
                        }}
                      />
                      <p className="mt-1 text-xs text-gray-500">Cantidad contada en piso</p>
                      {fieldErrors.NExcistencia && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <FiAlertCircle className="w-3 h-3" />
                          {fieldErrors.NExcistencia}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Precio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        disabled={loadingPrecio}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          fieldErrors.Precio ? 'border-red-300 bg-red-50' : precioAutoFill ? 'border-green-400 bg-green-50' : 'border-gray-300'
                        }`}
                        placeholder={loadingPrecio ? 'Buscando precio...' : '0.00'}
                        value={productoActual.Precio || ''}
                        onChange={(e) => {
                          setProductoActual({ ...productoActual, Precio: parseFloat(e.target.value) || 0 })
                          setFieldErrors({ ...fieldErrors, Precio: '' })
                          setPrecioAutoFill(false)
                        }}
                      />
                      {loadingPrecio && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {precioAutoFill ? '✓ Precio obtenido del último conteo registrado' : 'Precio unitario del producto'}
                    </p>
                    {fieldErrors.Precio && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <FiAlertCircle className="w-3 h-3" />
                        {fieldErrors.Precio}
                      </p>
                    )}
                  </div>
                  
                  {/* Diferencia automática — solo visible si no es nivel 4 */}
                  {!isNivel4 && (productoActual.NSistema > 0 || productoActual.NExcistencia > 0) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Diferencia</span>
                        <span className={`text-lg font-bold ${
                          productoActual.NExcistencia - productoActual.NSistema === 0
                            ? 'text-green-600'
                            : productoActual.NExcistencia - productoActual.NSistema > 0
                            ? 'text-blue-600'
                            : 'text-red-600'
                        }`}>
                          {productoActual.NExcistencia - productoActual.NSistema > 0 ? '+' : ''}
                          {(productoActual.NExcistencia - productoActual.NSistema).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Físico - Sistema</p>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={agregarProducto}
                    disabled={!formData.IdCentro}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <FiPlus className="w-5 h-5" />
                    Agregar a la lista
                  </button>
                </div>
              </div>

              {/* Lista de productos agregados */}
              {productosAgregados.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Productos agregados ({productosAgregados.length})
                    </h3>
                  </div>
                  <div className="md:hidden p-4 space-y-3">
                    {productosAgregados.map((producto) => {
                      const diferencia = producto.NExcistencia - producto.NSistema
                      return (
                        <div key={producto.id} className="border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-gray-900">{producto.Producto || 'Desconocido'}</p>
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

                          <div className="mt-2 space-y-1 text-sm text-gray-700">
                            <p><span className="text-gray-500">Código:</span> {producto.CodigoBarras}</p>
                            {!isNivel4 && <p><span className="text-gray-500">Sistema:</span> {producto.NSistema.toFixed(2)}</p>}
                            <p><span className="text-gray-500">Físico:</span> {producto.NExcistencia.toFixed(2)}</p>
                            <p><span className="text-gray-500">Precio:</span> ${producto.Precio.toFixed(2)}</p>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => editarProducto(producto.id)}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                            >
                              <FiEdit2 className="w-4 h-4 mr-1.5" /> Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarProducto(producto.id)}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
                            >
                              <FiTrash2 className="w-4 h-4 mr-1.5" /> Eliminar
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Producto</th>
                          <th className="px-4 py-3 text-left font-medium">Código</th>
                          {!isNivel4 && <th className="px-4 py-3 text-right font-medium">Sistema</th>}
                          <th className="px-4 py-3 text-right font-medium">Físico</th>
                          <th className="px-4 py-3 text-right font-medium">Precio</th>
                          {!isNivel4 && <th className="px-4 py-3 text-right font-medium">Diferencia</th>}
                          <th className="px-4 py-3 text-center font-medium">Opciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {productosAgregados.map((producto) => {
                          const diferencia = producto.NExcistencia - producto.NSistema
                          return (
                            <tr key={producto.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {producto.Producto || 'Desconocido'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {producto.CodigoBarras}
                              </td>
                              {!isNivel4 && (
                              <td className="px-4 py-3 text-sm text-gray-700 text-right">
                                {producto.NSistema.toFixed(2)}
                              </td>
                              )}
                              <td className="px-4 py-3 text-sm text-gray-700 text-right">
                                {producto.NExcistencia.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-right">
                                ${producto.Precio.toFixed(2)}
                              </td>
                              {!isNivel4 && (
                              <td className="px-4 py-3 text-sm font-semibold text-right">
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
                              )}
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => editarProducto(producto.id)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Editar producto"
                                  >
                                    <FiEdit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => eliminarProducto(producto.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Eliminar producto"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Total de productos
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {productosAgregados.length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Toast Notification */}
          {showToast && (
            <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-slide-in-right flex items-center gap-3 sm:max-w-md">
              <FiCheckCircle className="w-6 h-6" />
              <div>
                <p className="font-semibold">¡Conteo creado exitosamente!</p>
                <p className="text-sm text-green-100">{user?.NivelUsuario === 4 ? 'Pendiente de validación por Monitorista Soporte.' : 'Ahora puedes asignarlo o comenzar a contestarlo.'}</p>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="fixed bottom-0 left-0 right-0 md:static bg-white border-t border-gray-200 px-4 py-4 md:py-0 md:border-0 shadow-lg md:shadow-none">
            <div className="flex gap-3 max-w-5xl mx-auto">
              <button
                type="button"
                onClick={() => router.push('/conteos')}
                className="flex-1 md:flex-none px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2 min-h-[48px]"
              >
                <FiX className="w-5 h-5" />
                <span className="hidden sm:inline">Cancelar</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors flex items-center justify-center gap-2 min-h-[48px]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Creando...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="w-5 h-5" />
                    <span className="hidden sm:inline">Crear Conteo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Barcode Scanner Modal */}
        {showScanner && (
          <BarcodeScanner
            onScan={handleScan}
            onClose={closeScanner}
          />
        )}
      </div>
    </div>
  )
}

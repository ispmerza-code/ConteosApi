'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FiCalendar, FiArrowLeft, FiSave, FiCamera, FiShoppingBag, FiTrash2, FiPlus, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { conteosAPI, catalogoAPI } from '@/lib/api'
import { ConteoResponse, Sucursal } from '@/types/api'
import { NIVELES_ASIGNAR } from '@/lib/roles'
import dynamic from 'next/dynamic'

const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false })

export default function AsignarConteo() {
  const { user, selectedSucursal } = useAuth()
  const router = useRouter()
  
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [filtroZona, setFiltroZona] = useState('')
  const [sucursalQuery, setSucursalQuery] = useState('')
  const [showSucursalList, setShowSucursalList] = useState(false)
  const sucursalRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    IdCentro: selectedSucursal?.IdCentro || '',
    FechaAsignacion: ''
  })
  const [productoActual, setProductoActual] = useState({
    CodigoBarras: '',
    NSistema: 0,
    Precio: 0
  })
  const [productosAgregados, setProductosAgregados] = useState<Array<{
    id: string
    CodigoBarras: string
    NSistema: number
    Precio: number
    Producto?: string
  }>>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [loadingPrecio, setLoadingPrecio] = useState(false)
  const [error, setError] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [precioAutoFill, setPrecioAutoFill] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sucursalRef.current && !sucursalRef.current.contains(e.target as Node)) {
        setShowSucursalList(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (user?.NivelUsuario === 4) {
      router.replace('/dashboard')
      return
    }
    loadSucursales()
  }, [selectedSucursal, user])

  const sucursalesFiltradas = sucursales
    .filter(s => !filtroZona || (s.Zona || 'Sin zona') === filtroZona)
    .filter(s => {
      if (!sucursalQuery) return true
      const q = sucursalQuery.toLowerCase()
      return (
        s.IdCentro.toLowerCase().includes(q) ||
        s.Sucursales.toLowerCase().includes(q)
      )
    })

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
    setFieldErrors(prev => ({ ...prev, CodigoBarras: '' }))
    setShowScanner(false)
    fetchPrecio(barcode)
  }

  const closeScanner = () => {
    setShowScanner(false)
  }

  const agregarProducto = async () => {
    // Validar campos
    const errors: { [key: string]: string } = {}
    if (!productoActual.CodigoBarras) errors.CodigoBarras = 'El código de barras es requerido'
    if (productoActual.NSistema < 0) errors.NSistema = 'La cantidad no puede ser negativa'
    if (productoActual.Precio <= 0) errors.Precio = 'El precio debe ser mayor a 0'

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

      // Agregar producto con ID único
      const nuevoProducto = {
        ...productoActual,
        id: Date.now().toString(),
        Producto: nombreProducto
      }
      setProductosAgregados([...productosAgregados, nuevoProducto])
      
      // Limpiar formulario
      setProductoActual({ CodigoBarras: '', NSistema: 0, Precio: 0 })
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
        Precio: producto.Precio
      })
      eliminarProducto(id)
    }
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validación final
    if (!formData.IdCentro) {
      setFieldErrors({ IdCentro: 'Selecciona una sucursal' })
      return
    }
    if (productosAgregados.length === 0) {
      setError('Agrega al menos un producto para poder asignar el conteo')
      return
    }
    if (!formData.FechaAsignacion) {
      setFieldErrors({ FechaAsignacion: 'Selecciona una fecha' })
      return
    }
    
    setLoading(true)
    setError('')
    try {
      const detalles = productosAgregados.map(p => ({
        CodigoBarras: p.CodigoBarras,
        NSistema: p.NSistema,
        NExcistencia: 0,
        Precio: p.Precio
      }))
      const datosAsignacion = {
        IdCentro: formData.IdCentro,
        Fechal: formData.FechaAsignacion,
        detalles
      }
      await conteosAPI.asignarConteo(datosAsignacion)
      
      // Mostrar toast con información
      setToastMessage(`Conteo asignado a la sucursal ${selectedSucursal?.Sucursales || formData.IdCentro}`)
      setShowToast(true)
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Error al asignar conteo:', error)
      // Manejar diferentes tipos de errores
      let errorMessage = 'Error al asignar el conteo'
      
      if (error.response?.data?.detail) {
        // Si detail es un array de errores de validación
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail
            .map((err: any) => `${err.loc?.join(' → ') || 'Error'}: ${err.msg}`)
            .join(', ')
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail
        } else {
          errorMessage = JSON.stringify(error.response.data.detail)
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Verificar permisos
  if (!user || !NIVELES_ASIGNAR.has(user.NivelUsuario)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Acceso Denegado</h1>
          <p className="text-gray-600 mt-2">No tienes permisos para asignar conteos</p>
        </div>
      </div>
    )
  }

  if (user?.NivelUsuario === 4 && !selectedSucursal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Asignar Conteo</h1>
          <p className="mt-2 text-gray-600">
            Crea y asigna un nuevo conteo a un usuario
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Paso 1: Sucursal */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Sucursal</h2>
                  <p className="text-sm text-gray-600">Sucursal de trabajo seleccionada</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiShoppingBag className="inline w-4 h-4 mr-1" />
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
                <div className="space-y-3">
                  {/* Filtro por zona */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Filtrar por zona</label>
                    <select
                      disabled={loadingData}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-sm"
                      value={filtroZona}
                      onChange={e => {
                        setFiltroZona(e.target.value)
                        setFormData(prev => ({ ...prev, IdCentro: '' }))
                        setSucursalQuery('')
                        setFieldErrors({ ...fieldErrors, IdCentro: '' })
                      }}
                    >
                      <option value="">Todas las zonas</option>
                      {[...new Set(sucursales.map(s => s.Zona || 'Sin zona'))].sort().map(z => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>
                  {/* Autocomplete de sucursal filtrado por zona */}
                  <div ref={sucursalRef} className="relative">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sucursal</label>
                    <input
                      type="text"
                      autoComplete="off"
                      disabled={loadingData}
                      placeholder={loadingData ? 'Cargando sucursales...' : 'Buscar por nombre o código...'}
                      value={sucursalQuery}
                      onFocus={() => setShowSucursalList(true)}
                      onChange={e => {
                        setSucursalQuery(e.target.value)
                        setFormData(prev => ({ ...prev, IdCentro: '' }))
                        setFieldErrors({ ...fieldErrors, IdCentro: '' })
                        setShowSucursalList(true)
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                        fieldErrors.IdCentro ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {showSucursalList && sucursalesFiltradas.length > 0 && (
                      <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {sucursalesFiltradas.map(s => (
                          <li
                            key={s.IdCentro}
                            onMouseDown={() => {
                              setFormData(prev => ({ ...prev, IdCentro: s.IdCentro }))
                              setSucursalQuery(`${s.Sucursales} (${s.IdCentro})`)
                              setShowSucursalList(false)
                              setFieldErrors({ ...fieldErrors, IdCentro: '' })
                            }}
                            className="px-4 py-2.5 cursor-pointer hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                          >
                            <span className="font-medium text-gray-900">{s.Sucursales}</span>
                            <span className="ml-2 text-xs text-gray-500">{s.IdCentro}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {showSucursalList && sucursalQuery && sucursalesFiltradas.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-500">
                        Sin resultados para "{sucursalQuery}"
                      </div>
                    )}
                  </div>
                </div>
              )}
              {fieldErrors.IdCentro && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3" />{fieldErrors.IdCentro}
                </p>
              )}
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
                  <p className="text-sm text-gray-600">Agrega uno o varios productos que deberán ser revisados en este conteo</p>
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
                      Código de barras <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-0 border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500">
                      <input
                        type="text"
                        inputMode="numeric"
                          className={`flex-1 px-4 py-3 border-0 focus:ring-0 ${
                          fieldErrors.CodigoBarras ? 'bg-red-50' : 'bg-white'
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
                      <button
                        type="button"
                        onClick={openScanner}
                          className={`px-4 py-3 flex items-center justify-center transition-colors border-l border-gray-300 ${
                          showScanner
                            ? 'bg-gray-600 hover:bg-gray-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                        title={showScanner ? "Detener escaneo" : "Escanear código de barras"}
                      >
                        <FiCamera className="w-5 h-5" />
                      </button>
                    </div>
                    {fieldErrors.CodigoBarras && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <FiAlertCircle className="w-3 h-3" />
                        {fieldErrors.CodigoBarras}
                      </p>
                    )}
                    {showScanner && (
                      <p className="mt-2 text-sm text-green-600 flex items-center gap-1 animate-pulse">
                        <FiCamera className="w-3 h-3" />
                        Apunta la cámara al código de barras
                      </p>
                    )}
                  </div>
                  
                  {/* Cantidad y Precio */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Existencia Sistema <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                          fieldErrors.NSistema ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="0"
                        value={productoActual.NSistema || ''}
                        onChange={(e) => {
                          setProductoActual({ ...productoActual, NSistema: parseFloat(e.target.value) || 0 })
                          setFieldErrors({ ...fieldErrors, NSistema: '' })
                        }}
                      />
                      <p className="mt-1 text-xs text-gray-500">Cantidad esperada según sistema</p>
                      {fieldErrors.NSistema && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <FiAlertCircle className="w-3 h-3" />
                          {fieldErrors.NSistema}
                        </p>
                      )}
                    </div>
                    
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
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
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
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
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
                  </div>
                  
                  <button
                    type="button"
                    onClick={agregarProducto}
                    disabled={!formData.IdCentro}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-colors"
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
                    {productosAgregados.map((producto) => (
                      <div key={producto.id} className="border border-gray-200 rounded-lg p-4 shadow-sm">
                        <p className="text-sm font-semibold text-gray-900">{producto.Producto || 'Desconocido'}</p>
                        <div className="mt-2 space-y-1 text-sm text-gray-700">
                          <p><span className="text-gray-500">Código:</span> {producto.CodigoBarras}</p>
                          <p><span className="text-gray-500">Cantidad:</span> {producto.NSistema.toFixed(2)}</p>
                          <p><span className="text-gray-500">Precio:</span> ${producto.Precio.toFixed(2)}</p>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => editarProducto(producto.id)}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                          >
                            <FiSave className="w-4 h-4 mr-1.5" /> Editar
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
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Producto</th>
                          <th className="px-4 py-3 text-left font-medium">Código</th>
                          <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                          <th className="px-4 py-3 text-right font-medium">Precio</th>
                          <th className="px-4 py-3 text-center font-medium">Opciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {productosAgregados.map((producto) => (
                          <tr key={producto.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {producto.Producto || 'Desconocido'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {producto.CodigoBarras}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 text-right">
                              {producto.NSistema.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 text-right">
                              ${producto.Precio.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => editarProducto(producto.id)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Editar producto"
                                >
                                  <FiSave className="w-4 h-4" />
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
                        ))}
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

          {/* Paso 3: Fecha de asignación */}
          <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
            productosAgregados.length === 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
          }`}>
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Fecha de asignación</h2>
                  <p className="text-sm text-gray-600">Selecciona la fecha para este conteo</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {productosAgregados.length === 0 && (
                <div className="mb-4 p-3 bg-amber-100 border border-amber-300 rounded-lg flex items-start gap-2">
                  <FiAlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">Agrega al menos un producto para poder asignar el conteo</p>
                </div>
              )}
              
              <div className="max-w-xs">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiCalendar className="inline w-4 h-4 mr-1" />
                    Fecha de asignación <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      disabled={productosAgregados.length === 0}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        fieldErrors.FechaAsignacion ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      value={formData.FechaAsignacion}
                      onChange={e => {
                        setFormData({ ...formData, FechaAsignacion: e.target.value })
                        setFieldErrors({ ...fieldErrors, FechaAsignacion: '' })
                      }}
                    />
                  </div>
                  {fieldErrors.FechaAsignacion && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <FiAlertCircle className="w-3 h-3" />
                      {fieldErrors.FechaAsignacion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Toast Notification */}
          {showToast && (
            <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-slide-in-right flex items-center gap-3 sm:max-w-md">
              <FiCheckCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-semibold">¡Conteo asignado exitosamente!</p>
                <p className="text-sm text-green-100">{toastMessage}</p>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="fixed bottom-0 left-0 right-0 md:static bg-white border-t border-gray-200 px-4 py-4 md:py-0 md:border-0 shadow-lg md:shadow-none">
            <div className="flex gap-3 max-w-5xl mx-auto">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 md:flex-none px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2 min-h-[48px]"
              >
                <FiArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Cancelar</span>
              </button>
              <button
                type="submit"
                disabled={loading || !formData.IdCentro || productosAgregados.length === 0 || !formData.FechaAsignacion}
                className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2 min-h-[48px]"
                title={
                  !formData.IdCentro ? 'Selecciona una sucursal' :
                  productosAgregados.length === 0 ? 'Agrega al menos un producto' :
                  !formData.FechaAsignacion ? 'Selecciona una fecha' : ''
                }
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Asignando...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="w-5 h-5" />
                    <span className="hidden sm:inline">Asignar conteo</span>
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

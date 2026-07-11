'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiSearch, FiPlus, FiTrash2, FiFilter, FiChevronLeft, FiChevronRight, FiX, FiPackage, FiArrowLeft } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { catalogoAPI } from '@/lib/api'

interface Producto {
  CodigoBarras: string
  Producto: string
  IdMaterial: string
  IdFamilia: number
  IdCategoria: number
  IdSubcategoria: number
  Familia: string
  Categoria: string
  Subcategoria: string
}

export default function CatalogoPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [productos, setProductos] = useState<Producto[]>([])
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [familiaFilter, setFamiliaFilter] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Nuevo producto
  const [nuevoProducto, setNuevoProducto] = useState({
    CodigoBarras: '',
    Producto: '',
    IdMaterial: '',
    IdFamilia: 0,
    IdCategoria: 0,
    IdSubcategoria: 0
  })

  useEffect(() => {
    loadProductos()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [searchTerm, familiaFilter, categoriaFilter, productos])

  const loadProductos = async () => {
    try {
      setLoading(true)
      const data = await catalogoAPI.getProductos()
      setProductos(data)
      setFilteredProductos(data)
    } catch (error) {
      console.error('Error loading products:', error)
      alert('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...productos]
    
    // Filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.CodigoBarras.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.Producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.IdMaterial.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Filtro de familia
    if (familiaFilter) {
      filtered = filtered.filter(p => p.Familia === familiaFilter)
    }
    
    // Filtro de categoría
    if (categoriaFilter) {
      filtered = filtered.filter(p => p.Categoria === categoriaFilter)
    }
    
    setFilteredProductos(filtered)
    setCurrentPage(1)
  }

  const handleCreateProducto = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await catalogoAPI.createProducto(nuevoProducto)
      alert('Producto creado exitosamente')
      setShowModal(false)
      setNuevoProducto({
        CodigoBarras: '',
        Producto: '',
        IdMaterial: '',
        IdFamilia: 0,
        IdCategoria: 0,
        IdSubcategoria: 0
      })
      loadProductos()
    } catch (error: any) {
      console.error('Error creating product:', error)
      alert(error.response?.data?.detail || 'Error al crear producto')
    }
  }

  const handleDeleteProducto = async (codigoBarras: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return
    
    try {
      await catalogoAPI.deleteProducto(codigoBarras)
      alert('Producto eliminado exitosamente')
      loadProductos()
    } catch (error: any) {
      console.error('Error deleting product:', error)
      alert(error.response?.data?.detail || 'Error al eliminar producto')
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFamiliaFilter('')
    setCategoriaFilter('')
  }

  // Obtener familias y categorías únicas para filtros
  const familias = Array.from(new Set(productos.map(p => p.Familia))).sort()
  const categorias = Array.from(new Set(productos.map(p => p.Categoria))).sort()

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredProductos.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredProductos.length / itemsPerPage)

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getPaginationRange = () => {
    const range = []
    const showEllipsisStart = currentPage > 3
    const showEllipsisEnd = currentPage < totalPages - 2

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) range.push(i)
    } else {
      if (showEllipsisStart) {
        range.push(1, '...')
        const start = Math.max(2, currentPage - 1)
        const end = Math.min(totalPages - 1, currentPage + 1)
        for (let i = start; i <= end; i++) range.push(i)
      } else {
        for (let i = 1; i <= Math.min(5, totalPages); i++) range.push(i)
      }

      if (showEllipsisEnd && !showEllipsisStart) {
        range.push('...', totalPages)
      } else if (showEllipsisEnd) {
        range.push('...', totalPages)
      } else if (!showEllipsisStart && currentPage < totalPages - 2) {
        range.push('...', totalPages)
      }
    }
    return range
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Catálogo de Productos</h1>
              <p className="text-gray-600 mt-1">
                {filteredProductos.length} productos encontrados
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiPlus className="w-5 h-5 mr-2" />
              Agregar Producto
            </button>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por código de barras, nombre o material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Botón de filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full lg:w-auto flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FiFilter className="w-5 h-5 mr-2" />
              Filtros
              {(familiaFilter || categoriaFilter) && (
                <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  {[familiaFilter, categoriaFilter].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Panel de filtros expandible */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Familia
                  </label>
                  <select
                    value={familiaFilter}
                    onChange={(e) => setFamiliaFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas las familias</option>
                    {familias.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <select
                    value={categoriaFilter}
                    onChange={(e) => setCategoriaFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas las categorías</option>
                    {categorias.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(searchTerm || familiaFilter || categoriaFilter) && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <FiX className="w-4 h-4 mr-1" />
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tabla de productos */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="md:hidden p-4 space-y-3">
            {currentItems.map((producto) => (
              <div key={producto.CodigoBarras} className="border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">Código</p>
                    <p className="text-sm font-semibold text-gray-900 break-all">{producto.CodigoBarras}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteProducto(producto.CodigoBarras)}
                    className="inline-flex items-center justify-center p-2 rounded-md border border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                    aria-label={`Eliminar ${producto.Producto}`}
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-1 text-sm text-gray-700">
                  <p className="font-medium text-gray-900">{producto.Producto}</p>
                  <p><span className="text-gray-500">Material:</span> {producto.IdMaterial}</p>
                  <p><span className="text-gray-500">Familia:</span> {producto.Familia}</p>
                  <p><span className="text-gray-500">Categoría:</span> {producto.Categoria}</p>
                  <p><span className="text-gray-500">Subcategoría:</span> {producto.Subcategoria}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código de Barras
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Familia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subcategoría
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((producto) => (
                  <tr key={producto.CodigoBarras} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {producto.CodigoBarras}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {producto.Producto}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {producto.IdMaterial}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {producto.Familia}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {producto.Categoria}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {producto.Subcategoria}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteProducto(producto.CodigoBarras)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProductos.length === 0 && (
            <div className="text-center py-12">
              <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No se encontraron productos</p>
              <p className="text-sm text-gray-400 mt-1">Intenta ajustar los filtros</p>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredProductos.length)}
                  </span>{' '}
                  de <span className="font-medium">{filteredProductos.length}</span> productos
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="hidden sm:flex items-center gap-2">
                    {getPaginationRange().map((page, index) =>
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-3 py-1 text-gray-500">
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => goToPage(page as number)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>

                  <div className="sm:hidden">
                    <span className="text-sm text-gray-700">
                      Página {currentPage} de {totalPages}
                    </span>
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para agregar producto */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Agregar Nuevo Producto</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateProducto} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código de Barras *
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoProducto.CodigoBarras}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, CodigoBarras: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoProducto.Producto}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, Producto: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID Material *
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoProducto.IdMaterial}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, IdMaterial: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID Familia *
                  </label>
                  <input
                    type="number"
                    required
                    value={nuevoProducto.IdFamilia || ''}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, IdFamilia: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID Categoría *
                  </label>
                  <input
                    type="number"
                    required
                    value={nuevoProducto.IdCategoria || ''}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, IdCategoria: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID Subcategoría *
                  </label>
                  <input
                    type="number"
                    required
                    value={nuevoProducto.IdSubcategoria || ''}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, IdSubcategoria: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Crear Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

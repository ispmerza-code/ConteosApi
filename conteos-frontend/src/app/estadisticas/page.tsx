'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiBarChart,
  FiCalendar,
  FiCheckCircle,
  FiFilter,
  FiMapPin,
  FiPackage,
  FiTag,
  FiTrendingDown,
  FiTrendingUp,
  FiX,
} from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { catalogoAPI, conteosAPI } from '@/lib/api'
import { ConteoResponse } from '@/types/api'

interface SucursalData {
  IdCentro: string
  Sucursales: string
  IdZona?: number
  Zona?: string | null
}

interface ProductAggregate {
  CodigoBarras: string
  Producto: string
  diferencia: number
  Precio?: number
  monto?: number
}

interface CategoryAggregate {
  categoria: string
  diferencia: number
  monto?: number
}

interface GroupStats {
  faltantes: CategoryAggregate[]
  sobrantes: CategoryAggregate[]
  detallesFaltantes: Record<string, ProductAggregate[]>
  detallesSobrantes: Record<string, ProductAggregate[]>
}

interface CatalogProduct {
  CodigoBarras: string
  Categoria?: string
  IdCategoria?: number
}

const TOP_LIMIT = 10

const EMPTY_GROUP_STATS: GroupStats = {
  faltantes: [],
  sobrantes: [],
  detallesFaltantes: {},
  detallesSobrantes: {},
}

const getDatePart = (value: string) => (value || '').split('T')[0]

const addToCategoryProductMap = (
  categoryProductMap: Record<string, Record<string, ProductAggregate>>,
  categoria: string,
  codigoBarras: string,
  producto: string,
  diferencia: number,
  precio?: number
) => {
  if (!categoryProductMap[categoria]) {
    categoryProductMap[categoria] = {}
  }

  if (!categoryProductMap[categoria][codigoBarras]) {
    categoryProductMap[categoria][codigoBarras] = {
      CodigoBarras: codigoBarras,
      Producto: producto,
      diferencia: 0,
      Precio: precio || 0,
      monto: 0,
    }
  }

  categoryProductMap[categoria][codigoBarras].diferencia += diferencia
  categoryProductMap[categoria][codigoBarras].monto =
    (categoryProductMap[categoria][codigoBarras].monto || 0) + diferencia * (precio || 0)
}

const getProductsByType = (
  categoryProducts: Record<string, ProductAggregate>,
  type: 'faltante' | 'sobrante'
) => {
  return Object.values(categoryProducts)
    .filter((product) => (type === 'faltante' ? product.diferencia < 0 : product.diferencia > 0))
    .sort((a, b) => (type === 'faltante' ? a.diferencia - b.diferencia : b.diferencia - a.diferencia))
    .map((product) => ({
      ...product,
      diferencia: Math.abs(product.diferencia),
      monto: Math.abs(product.monto || 0),
    }))
}

const getTotalDifference = (products: ProductAggregate[]) => {
  return products.reduce((acc, product) => acc + product.diferencia, 0)
}

const getTotalAmount = (products: ProductAggregate[]) => {
  return products.reduce((acc, product) => acc + (product.monto || 0), 0)
}

const getTopCategories = (categories: CategoryAggregate[], limit = TOP_LIMIT) => {
  return categories.sort((a, b) => b.diferencia - a.diferencia).slice(0, limit)
}

const buildGroupStats = (categoryProductMap: Record<string, Record<string, ProductAggregate>>): GroupStats => {
  const faltantes: CategoryAggregate[] = []
  const sobrantes: CategoryAggregate[] = []

  const detallesFaltantes: Record<string, ProductAggregate[]> = {}
  const detallesSobrantes: Record<string, ProductAggregate[]> = {}

    for (const [categoria, products] of Object.entries(categoryProductMap)) {
    const productsFaltantes = getProductsByType(products, 'faltante')
    const productsSobrantes = getProductsByType(products, 'sobrante')

    const totalFaltante = getTotalDifference(productsFaltantes)
    const totalFaltanteMonto = getTotalAmount(productsFaltantes)
    const totalSobrante = getTotalDifference(productsSobrantes)
    const totalSobranteMonto = getTotalAmount(productsSobrantes)

    if (totalFaltante > 0) {
      faltantes.push({ categoria, diferencia: totalFaltante, monto: totalFaltanteMonto })
      detallesFaltantes[categoria] = productsFaltantes
    }

    if (totalSobrante > 0) {
      sobrantes.push({ categoria, diferencia: totalSobrante, monto: totalSobranteMonto })
      detallesSobrantes[categoria] = productsSobrantes
    }
  }

  const topFaltantes = getTopCategories(faltantes, TOP_LIMIT)
  const topSobrantes = getTopCategories(sobrantes, TOP_LIMIT)

  const topFaltantesSet = new Set(topFaltantes.map((item) => item.categoria))
  const topSobrantesSet = new Set(topSobrantes.map((item) => item.categoria))

  const topDetallesFaltantes = Object.fromEntries(
    Object.entries(detallesFaltantes).filter(([categoria]) => topFaltantesSet.has(categoria))
  )
  const topDetallesSobrantes = Object.fromEntries(
    Object.entries(detallesSobrantes).filter(([categoria]) => topSobrantesSet.has(categoria))
  )

  return {
    faltantes: topFaltantes,
    sobrantes: topSobrantes,
    detallesFaltantes: topDetallesFaltantes,
    detallesSobrantes: topDetallesSobrantes,
  }
}

function CategoryRankingTable({
  title,
  rows,
  detailsByCategory,
  emptyMessage,
  type,
}: {
  title: string
  rows: CategoryAggregate[]
  detailsByCategory: Record<string, ProductAggregate[]>
  emptyMessage: string
  type: 'faltante' | 'sobrante'
}) {
  const [selectedCategory, setSelectedCategory] = useState('')

  useEffect(() => {
    if (!selectedCategory) return

    const exists = rows.some((row) => row.categoria === selectedCategory)
    if (!exists) {
      setSelectedCategory('')
    }
  }, [rows, selectedCategory])

  const selectedProducts = selectedCategory ? detailsByCategory[selectedCategory] || [] : []

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className={`px-5 py-4 border-b ${type === 'faltante' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
        <h3 className={`text-base font-semibold flex items-center gap-2 ${type === 'faltante' ? 'text-red-800' : 'text-green-800'}`}>
          {type === 'faltante' ? <FiTrendingDown className="w-4 h-4" /> : <FiTrendingUp className="w-4 h-4" />}
          {title}
        </h3>
        <p className="text-xs mt-1 text-gray-600">Haz clic en una categoría para ver su detalle de productos.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 min-w-[70px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-4 py-3 min-w-[300px] whitespace-nowrap text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="px-4 py-3 min-w-[150px] whitespace-nowrap text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {type === 'faltante' ? 'Faltante' : 'Sobrante'}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={`${row.categoria}-${index}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(selectedCategory === row.categoria ? '' : row.categoria)}
                      className="text-left hover:underline text-blue-700"
                    >
                      {row.categoria}
                    </button>
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-right ${type === 'faltante' ? 'text-red-600' : 'text-green-600'}`}>
                    <div className="font-semibold">{row.diferencia.toFixed(2)}</div>
                    <div className="text-xs text-gray-600 mt-1">{(row.monto || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedCategory && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Detalle de productos en categoría: {selectedCategory}
          </h4>

          <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
            <table className="w-full min-w-[620px] divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedProducts.length > 0 ? (
                  selectedProducts.map((product, index) => (
                    <tr key={`${product.CodigoBarras}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{index + 1}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{product.CodigoBarras}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{product.Producto}</td>
                      <td className={`px-4 py-2 whitespace-nowrap text-sm text-right font-semibold ${type === 'faltante' ? 'text-red-600' : 'text-green-600'}`}>
                        {product.diferencia.toFixed(2)}
                      </td>
                      <td className={`px-4 py-2 whitespace-nowrap text-sm text-right font-semibold ${type === 'faltante' ? 'text-red-600' : 'text-green-600'}`}>
                        {(product.monto || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                      </td>
                    </tr>
                  ))
                ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                        No hay productos para esta categoría.
                      </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductListTable({
  title,
  rows,
  type,
  emptyMessage,
}: {
  title: string
  rows: ProductAggregate[]
  type: 'faltante' | 'sobrante'
  emptyMessage: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className={`px-5 py-4 border-b ${type === 'faltante' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
        <h3 className={`text-base font-semibold flex items-center gap-2 ${type === 'faltante' ? 'text-red-800' : 'text-green-800'}`}>
          {type === 'faltante' ? <FiTrendingDown className="w-4 h-4" /> : <FiTrendingUp className="w-4 h-4" />}
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.length > 0 ? (
              rows.map((row, i) => (
                <tr key={row.CodigoBarras} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{i + 1}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{row.CodigoBarras}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{row.Producto}</td>
                  <td className={`px-4 py-2 whitespace-nowrap text-sm text-right font-semibold ${type === 'faltante' ? 'text-red-600' : 'text-green-600'}`}>
                    {row.diferencia.toFixed(2)}
                  </td>
                  <td className={`px-4 py-2 whitespace-nowrap text-sm text-right font-semibold ${type === 'faltante' ? 'text-red-600' : 'text-green-600'}`}>
                    {(row.monto || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">{emptyMessage}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function EstadisticasPage() {
  const { user, isLoading, selectedSucursal: authSucursal } = useAuth()
  const router = useRouter()

  const isNivel4 = user?.NivelUsuario === 4

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [conteosAnalizados, setConteosAnalizados] = useState(0)
  const [globalStats, setGlobalStats] = useState<GroupStats>(EMPTY_GROUP_STATS)
  const [conteosDetalladosAll, setConteosDetalladosAll] = useState<ConteoResponse[]>([])
  const [categoryByCode, setCategoryByCode] = useState<Record<string, string>>({})

  const [sucursales, setSucursales] = useState<SucursalData[]>([])
  const [zonas, setZonas] = useState<string[]>([])

  const [statsBySucursal, setStatsBySucursal] = useState<Record<string, GroupStats>>({})
  const [statsByZona, setStatsByZona] = useState<Record<string, GroupStats>>({})

  const [selectedSucursal, setSelectedSucursal] = useState('')
  const [selectedZona, setSelectedZona] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const recalculateStatistics = (
    conteosInput: ConteoResponse[],
    sucursalesInput: SucursalData[],
    categoryMap: Record<string, string>
  ) => {
    const sucursalMap = sucursalesInput.reduce((acc: Record<string, SucursalData>, sucursal) => {
      acc[sucursal.IdCentro] = sucursal
      return acc
    }, {})

    const conteosFiltrados = conteosInput.filter((conteo) => {
      const fechaConteo = getDatePart(conteo.Fechal)

      if (dateFrom && fechaConteo < dateFrom) return false
      if (dateTo && fechaConteo > dateTo) return false

      return true
    })

    setConteosAnalizados(conteosFiltrados.length)

    const globalByCategory: Record<string, Record<string, ProductAggregate>> = {}
    const bySucursalByCategory: Record<string, Record<string, Record<string, ProductAggregate>>> = {}
    const byZonaByCategory: Record<string, Record<string, Record<string, ProductAggregate>>> = {}

    for (const conteo of conteosFiltrados) {
      const sucursalId = conteo.IdCentro
      const sucursalInfo = sucursalMap[sucursalId]
      const zonaLabel = sucursalInfo?.Zona?.trim() || (sucursalInfo?.IdZona ? `Zona ${sucursalInfo.IdZona}` : 'Sin zona')

      if (!bySucursalByCategory[sucursalId]) bySucursalByCategory[sucursalId] = {}
      if (!byZonaByCategory[zonaLabel]) byZonaByCategory[zonaLabel] = {}

      for (const detalle of conteo.detalles || []) {
        const diferencia = Number(detalle.NExcistencia) - Number(detalle.NSistema)
        if (diferencia === 0) continue

        const categoria = categoryMap[detalle.CodigoBarras] || 'Sin categoría'
        const producto = detalle.Producto || 'Sin nombre'

        const precio = Number(detalle.Precio || 0)
        addToCategoryProductMap(globalByCategory, categoria, detalle.CodigoBarras, producto, diferencia, precio)
        addToCategoryProductMap(bySucursalByCategory[sucursalId], categoria, detalle.CodigoBarras, producto, diferencia, precio)
        addToCategoryProductMap(byZonaByCategory[zonaLabel], categoria, detalle.CodigoBarras, producto, diferencia, precio)
      }
    }

    setGlobalStats(buildGroupStats(globalByCategory))

    const groupedSucursalStats = Object.fromEntries(
      Object.entries(bySucursalByCategory).map(([sucursal, categoryMapBySucursal]) => [
        sucursal,
        buildGroupStats(categoryMapBySucursal),
      ])
    )

    const groupedZonaStats = Object.fromEntries(
      Object.entries(byZonaByCategory).map(([zona, categoryMapByZona]) => [
        zona,
        buildGroupStats(categoryMapByZona),
      ])
    )

    setStatsBySucursal(groupedSucursalStats)
    setStatsByZona(groupedZonaStats)
  }

  useEffect(() => {
    if (!isLoading && user) {
      void loadStatistics()
    }
  }, [isLoading, user])

  useEffect(() => {
    if (sucursales.length === 0) return
    recalculateStatistics(conteosDetalladosAll, sucursales, categoryByCode)
  }, [conteosDetalladosAll, sucursales, categoryByCode, dateFrom, dateTo])

  const loadStatistics = async () => {
    try {
      setLoading(true)
      setError('')

      const [conteosBase, sucursalesBase, catalogoBase] = await Promise.all([
        conteosAPI.getConteos(),
        conteosAPI.getSucursales(),
        catalogoAPI.getProductos(),
      ])

      const categoryMap = (catalogoBase as CatalogProduct[]).reduce((acc: Record<string, string>, product) => {
        acc[product.CodigoBarras] =
          product.Categoria?.trim() || (product.IdCategoria ? `Categoría ${product.IdCategoria}` : 'Sin categoría')
        return acc
      }, {})
      setCategoryByCode(categoryMap)

      const sucursalesList = (sucursalesBase as SucursalData[])
        .slice()
        .sort((a, b) => a.IdCentro.localeCompare(b.IdCentro))
      const zoneSet = new Set<string>()
      for (const sucursal of sucursalesList) {
        const zoneLabel = sucursal.Zona?.trim() || (sucursal.IdZona ? `Zona ${sucursal.IdZona}` : 'Sin zona')
        zoneSet.add(zoneLabel)
      }

      const allZones = Array.from(zoneSet).sort((a, b) => a.localeCompare(b))
      setZonas(allZones)

      const conteosDetalladosRaw = await Promise.all(
        (conteosBase as Array<{ idConteo: number }>).map(async (conteo) => {
          try {
            return await conteosAPI.getConteo(conteo.idConteo)
          } catch {
            return null
          }
        })
      )

      const conteosDetallados = conteosDetalladosRaw.filter(Boolean) as ConteoResponse[]

      // Para nivel 4: filtrar solo a la sucursal que eligió al iniciar sesión
      const conteosParaProcesar = isNivel4 && authSucursal
        ? conteosDetallados.filter((c) => c.IdCentro === authSucursal.IdCentro)
        : conteosDetallados

      const sucursalesParaProcesar = isNivel4 && authSucursal
        ? sucursalesList.filter((s) => s.IdCentro === authSucursal.IdCentro)
        : sucursalesList

      setSucursales(sucursalesParaProcesar)
      setConteosDetalladosAll(conteosParaProcesar)
      recalculateStatistics(conteosParaProcesar, sucursalesParaProcesar, categoryMap)

      if (isNivel4 && authSucursal) {
        setSelectedSucursal(authSucursal.IdCentro)
      } else if (!selectedSucursal && sucursalesList.length > 0) {
        setSelectedSucursal(sucursalesList[0].IdCentro)
      }

      if (!selectedZona && allZones.length > 0) {
        setSelectedZona(allZones[0])
      }
    } catch (loadError) {
      console.error('Error al cargar estadísticas:', loadError)
      setError('No se pudieron cargar las estadísticas. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const selectedSucursalStats = statsBySucursal[selectedSucursal] || EMPTY_GROUP_STATS
  const selectedZonaStats = statsByZona[selectedZona] || EMPTY_GROUP_STATS

  const selectedSucursalData = sucursales.find((sucursal) => sucursal.IdCentro === selectedSucursal)
  const selectedSucursalLabel = selectedSucursalData
    ? `${selectedSucursalData.IdCentro} - ${selectedSucursalData.Sucursales}`
    : selectedSucursal

  // Para nivel 4: lista plana de productos (sin agrupación por categoría)
  const allProductsFaltantes: ProductAggregate[] = Object.values(globalStats.detallesFaltantes)
    .flat()
    .sort((a, b) => b.diferencia - a.diferencia)
  const allProductsSobrantes: ProductAggregate[] = Object.values(globalStats.detallesSobrantes)
    .flat()
    .sort((a, b) => b.diferencia - a.diferencia)

  const totalFaltanteCantidad = globalStats.faltantes.reduce((acc, g) => acc + g.diferencia, 0)
  const totalFaltanteMonto = globalStats.faltantes.reduce((acc, g) => acc + (g.monto || 0), 0)
  const totalSobranteCantidad = globalStats.sobrantes.reduce((acc, g) => acc + g.diferencia, 0)
  const totalSobranteMonto = globalStats.sobrantes.reduce((acc, g) => acc + (g.monto || 0), 0)

  const hasRange = dateFrom !== '' && dateTo !== ''

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center max-w-md w-full">
          <FiAlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-900">Sesión no disponible</h2>
          <p className="mt-2 text-sm text-gray-600">Inicia sesión para consultar estadísticas.</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-5 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Ir a login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </button>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FiBarChart className="w-7 h-7 text-blue-600" />
              Estadísticas
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Faltantes y sobrantes por categoría, con detalle de productos al hacer clic.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Rango de fechas</h2>
              <p className="text-sm text-gray-600 mt-1">Filtra las estadísticas por fecha de conteo.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setDateFrom('')
                setDateTo('')
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Limpiar rango
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => setDateFrom(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => setDateTo(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {hasRange ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Conteos analizados</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{conteosAnalizados}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Categorías faltantes</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{globalStats.faltantes.length}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Cantidad: <span className="font-semibold text-red-600">{totalFaltanteCantidad.toFixed(2)}</span>
                  {' '}• Monto:{' '}
                  <span className="font-semibold text-red-600">{totalFaltanteMonto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span>
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Categorías sobrantes</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{globalStats.sobrantes.length}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Cantidad: <span className="font-semibold text-green-600">{totalSobranteCantidad.toFixed(2)}</span>
                  {' '}• Monto:{' '}
                  <span className="font-semibold text-green-600">{totalSobranteMonto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span>
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Fecha de consulta</p>
                <p className="text-sm font-semibold text-gray-900 mt-2 flex items-center gap-2">
                  <FiCalendar className="w-4 h-4 text-gray-500" />
                  {new Date().toLocaleDateString('es-MX')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
              {isNivel4 ? (
                <>
                  <ProductListTable
                    title="Productos con faltante en tus tiendas"
                    rows={allProductsFaltantes}
                    type="faltante"
                    emptyMessage="No hay productos con faltantes en los conteos analizados."
                  />
                  <ProductListTable
                    title="Productos con sobrante en tus tiendas"
                    rows={allProductsSobrantes}
                    type="sobrante"
                    emptyMessage="No hay productos con sobrantes en los conteos analizados."
                  />
                </>
              ) : (
                <>
                  <CategoryRankingTable
                    title="Categorías con más faltante (General)"
                    rows={globalStats.faltantes}
                    detailsByCategory={globalStats.detallesFaltantes}
                    emptyMessage="No hay categorías con faltantes en los conteos analizados."
                    type="faltante"
                  />
                  <CategoryRankingTable
                    title="Categorías con más sobrante (General)"
                    rows={globalStats.sobrantes}
                    detailsByCategory={globalStats.detallesSobrantes}
                    emptyMessage="No hay categorías con sobrantes en los conteos analizados."
                    type="sobrante"
                  />
                </>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FiPackage className="w-5 h-5 text-indigo-600" />
                    Por sucursal
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Consulta faltantes y sobrantes por categoría en cada sucursal.</p>
                </div>
                {!isNivel4 && (
                <div className="w-full sm:w-80">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sucursal</label>
                  <select
                    value={selectedSucursal}
                    onChange={(event) => setSelectedSucursal(event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {sucursales.map((sucursal) => (
                      <option key={sucursal.IdCentro} value={sucursal.IdCentro}>
                        {sucursal.IdCentro} - {sucursal.Sucursales}
                      </option>
                    ))}
                  </select>
                </div>
                )}
              </div>

              <div className="mb-4 text-sm text-gray-600 flex items-center gap-2">
                <FiMapPin className="w-4 h-4 text-gray-500" />
                {selectedSucursalLabel || 'Sin sucursal seleccionada'}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <CategoryRankingTable
                  title="Categorías con más faltante en sucursal"
                  rows={selectedSucursalStats.faltantes}
                  detailsByCategory={selectedSucursalStats.detallesFaltantes}
                  emptyMessage="Sin categorías faltantes para esta sucursal."
                  type="faltante"
                />
                <CategoryRankingTable
                  title="Categorías con más sobrante en sucursal"
                  rows={selectedSucursalStats.sobrantes}
                  detailsByCategory={selectedSucursalStats.detallesSobrantes}
                  emptyMessage="Sin categorías sobrantes para esta sucursal."
                  type="sobrante"
                />
              </div>
            </div>

            {!isNivel4 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FiMapPin className="w-5 h-5 text-teal-600" />
                    Por zona
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Consulta faltantes y sobrantes por categoría en cada zona.</p>
                </div>
                <div className="w-full sm:w-80">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zona</label>
                  <select
                    value={selectedZona}
                    onChange={(event) => setSelectedZona(event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    {zonas.map((zona) => (
                      <option key={zona} value={zona}>
                        {zona}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4 text-sm text-gray-600 flex items-center gap-2">
                <FiMapPin className="w-4 h-4 text-gray-500" />
                {selectedZona || 'Sin zona seleccionada'}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <CategoryRankingTable
                  title="Categorías con más faltante en zona"
                  rows={selectedZonaStats.faltantes}
                  detailsByCategory={selectedZonaStats.detallesFaltantes}
                  emptyMessage="Sin categorías faltantes para esta zona."
                  type="faltante"
                />
                <CategoryRankingTable
                  title="Categorías con más sobrante en zona"
                  rows={selectedZonaStats.sobrantes}
                  detailsByCategory={selectedZonaStats.detallesSobrantes}
                  emptyMessage="Sin categorías sobrantes para esta zona."
                  type="sobrante"
                />
              </div>
            </div>
            )}

            <div className="mt-8 text-xs text-gray-500 flex items-center gap-2">
              <FiCheckCircle className="w-4 h-4 text-gray-400" />
              El ranking se calcula por diferencia neta entre existencias físicas y de sistema, agrupado por categoría.
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 text-center text-gray-600">
            Selecciona un rango de fechas (Desde y Hasta) para ver los resultados.
          </div>
        )}
      </div>
    </div>
  )
}

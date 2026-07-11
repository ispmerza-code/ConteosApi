import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Configurar axios con interceptores
const api = axios.create({
  baseURL: API_BASE_URL,
})

// Interceptor para añadir el token a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: async (credentials: { IdUsuarios: number; Contraseña: string }) => {
    const response = await api.post('/api/v1/auth/login', credentials)
    return response.data
  },
  
  getProfile: async () => {
    const response = await api.get('/api/v1/auth/me')
    return response.data
  },

  getRole: async () => {
    const response = await api.get('/api/v1/auth/role')
    return response.data
  },

  // Gestión de usuarios APP
  getAppUsuarios: async () => {
    const response = await api.get('/api/v1/auth/apps')
    return response.data
  },

  getAppSucursales: async (userId: number) => {
    const response = await api.get(`/api/v1/auth/apps/${userId}/sucursales`)
    return response.data
  },

  setAppSucursales: async (userId: number, centros: string[]) => {
    const response = await api.put(`/api/v1/auth/apps/${userId}/sucursales`, centros)
    return response.data
  }
}

// Conteos API
export const conteosAPI = {
  // Obtener sucursales
  getSucursales: async () => {
    const response = await api.get('/api/v1/conteos/sucursales')
    return response.data
  },
  // Obtener conteos paginados (listado ligero, sin detalles por producto)
  getConteosPaginados: async (opts: {
    skip?: number
    limit?: number
    idCentro?: string
    envio?: number
    estatus?: number
    q?: string
    centro?: string
    fechaDesde?: string
    fechaHasta?: string
    orden?: 'recent' | 'oldest'
  } = {}) => {
    const params = new URLSearchParams()
    params.set('skip', String(opts.skip ?? 0))
    params.set('limit', String(opts.limit ?? 20))
    if (opts.idCentro) params.set('id_centro', opts.idCentro)
    if (opts.envio !== undefined) params.set('envio', String(opts.envio))
    if (opts.estatus !== undefined) params.set('estatus', String(opts.estatus))
    if (opts.q?.trim()) params.set('q', opts.q.trim())
    if (opts.centro?.trim()) params.set('centro', opts.centro.trim())
    if (opts.fechaDesde) params.set('fecha_desde', opts.fechaDesde)
    if (opts.fechaHasta) params.set('fecha_hasta', opts.fechaHasta)
    params.set('orden', opts.orden === 'oldest' ? 'asc' : 'desc')
    const response = await api.get(`/api/v1/conteos/?${params.toString()}`)
    return response.data
  },

  // Compatibilidad: devuelve solo items (para contestar, dashboard, etc.)
  getConteos: async (idCentro?: string, limit = 500, envio?: number, estatus?: number) => {
    const data = await conteosAPI.getConteosPaginados({
      skip: 0,
      limit,
      idCentro,
      envio,
      estatus,
    })
    return data.items
  },

  // Resumen para dashboard (stats + últimos 5)
  getConteosResumen: async (idCentro?: string) => {
    const params = new URLSearchParams()
    if (idCentro) params.set('id_centro', idCentro)
    const qs = params.toString()
    const response = await api.get(`/api/v1/conteos/resumen/dashboard${qs ? `?${qs}` : ''}`)
    return response.data
  },

  // Conteos con detalles en una sola petición (estadísticas)
  getConteosConDetalles: async (idCentro?: string) => {
    const params = new URLSearchParams()
    if (idCentro) params.set('id_centro', idCentro)
    const qs = params.toString()
    const response = await api.get(`/api/v1/conteos/con-detalles${qs ? `?${qs}` : ''}`)
    return response.data
  },

  // Obtener un conteo específico
  getConteo: async (id: number) => {
    const response = await api.get(`/api/v1/conteos/${id}`)
    return response.data
  },

  // Crear nuevo conteo
  createConteo: async (data: { IdCentro: string; detalles: any[] }) => {
    const response = await api.post('/api/v1/conteos/crear', data)
    return response.data
  },

  // Asignar conteo
  asignarConteo: async (data: { IdCentro: string; Fechal?: string; IdUsuario?: number; detalles: any[] }) => {
    const response = await api.post('/api/v1/conteos/asignar', data)
    return response.data
  },

  // Editar conteo existente
  editarConteo: async (id: number, data: any) => {
    const response = await api.put(`/api/v1/conteos/${id}/editar`, data)
    return response.data
  },

  // Reasignar (reabrir) conteo y poner existencias a cero
  reasignarConteo: async (id: number) => {
    const response = await api.put(`/api/v1/conteos/${id}/reasignar`)
    return response.data
  },

  // Contestar conteo
  contestarConteo: async (id: number, data: { detalles: any[] }) => {
    const response = await api.put(`/api/v1/conteos/${id}/contestar`, data)
    return response.data
  },

  // Validar conteo (nivel 3 llena NSistema)
  validarConteo: async (id: number, detalles: { CodigoBarras: string; NSistema: number }[]) => {
    const response = await api.put(`/api/v1/conteos/${id}/validar`, { detalles })
    return response.data
  },

  // Eliminar conteo (solo admin)
  deleteConteo: async (id: number) => {
    const response = await api.delete(`/api/v1/conteos/${id}`)
    return response.data
  },

  // Obtener usuarios para asignación
  getUsuarios: async () => {
    const response = await api.get('/api/v1/auth/usuarios')
    return response.data
  },

  // Obtener usuarios asignados a una sucursal
  getUsersBySucursal: async (centroId: string) => {
    const response = await api.get(`/api/v1/auth/usuarios/sucursal/${encodeURIComponent(centroId)}`)
    return response.data
  },

  // Obtener conteos por usuario
  getConteosByUser: async (userId: number) => {
    const response = await api.get(`/api/v1/conteos/usuario/${userId}`)
    return response.data
  },

  // Obtener conteos por sucursal
  getConteosBySucursal: async (centroId: string) => {
    const response = await api.get(`/api/v1/conteos/sucursal/${centroId}`)
    return response.data
  }
}

// Catálogo API
export const catalogoAPI = {
  getProductosPaginados: async (opts: {
    skip?: number
    limit?: number
    q?: string
    familia?: string
    categoria?: string
  } = {}) => {
    const params = new URLSearchParams()
    params.set('skip', String(opts.skip ?? 0))
    params.set('limit', String(opts.limit ?? 20))
    if (opts.q?.trim()) params.set('q', opts.q.trim())
    if (opts.familia) params.set('familia', opts.familia)
    if (opts.categoria) params.set('categoria', opts.categoria)
    const response = await api.get(`/api/v1/catalogo/?${params.toString()}`)
    return response.data
  },

  getFiltros: async (): Promise<{ familias: string[]; categorias: string[] }> => {
    const response = await api.get('/api/v1/catalogo/filtros')
    return response.data
  },

  // Mapa código → categoría (ligero, para estadísticas)
  getCategoriasMap: async (): Promise<Record<string, string>> => {
    const response = await api.get('/api/v1/catalogo/categorias/map')
    return response.data
  },

  // Obtener un producto específico por código de barras
  getProducto: async (codigoBarras: string) => {
    const response = await api.get(`/api/v1/catalogo/${codigoBarras}`)
    return response.data
  },

  // Obtener el último precio registrado para un código de barras
  getUltimoPrecio: async (codigoBarras: string): Promise<number | null> => {
    const response = await api.get(`/api/v1/catalogo/${codigoBarras}/ultimo-precio`)
    return response.data.Precio
  },

  // Crear nuevo producto
  createProducto: async (data: {
    CodigoBarras: string
    Producto: string
    IdMaterial: string
    IdFamilia: number
    IdCategoria: number
    IdSubcategoria: number
  }) => {
    const response = await api.post('/api/v1/catalogo/crear', data)
    return response.data
  },

  // Eliminar producto
  deleteProducto: async (codigoBarras: string) => {
    const response = await api.delete(`/api/v1/catalogo/${codigoBarras}`)
    return response.data
  }
}

import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

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
  }
}

// Conteos API
export const conteosAPI = {
  // Obtener sucursales
  getSucursales: async () => {
    const response = await api.get('/api/v1/conteos/sucursales')
    return response.data
  },
  // Obtener todos los conteos
  getConteos: async () => {
    const response = await api.get('/api/v1/conteos/')
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
  asignarConteo: async (data: { IdCentro: string; Fechal?: string; IdUsuario: number; detalles: any[] }) => {
    const response = await api.post('/api/v1/conteos/asignar', data)
    return response.data
  },

  // Editar conteo existente
  editarConteo: async (id: number, data: any) => {
    const response = await api.put(`/api/v1/conteos/${id}/editar`, data)
    return response.data
  },

  // Contestar conteo
  contestarConteo: async (id: number, data: { detalles: any[] }) => {
    const response = await api.put(`/api/v1/conteos/${id}/contestar`, data)
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

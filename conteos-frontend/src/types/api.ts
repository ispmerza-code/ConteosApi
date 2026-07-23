export interface User {
  IdUsuarios: number;
  NombreUsuario: string;
  NivelUsuario: number;
  Estatus: number;
  Rol?: UserRole; // Campo calculado en el frontend
}

export interface LoginRequest {
  IdUsuarios: number;
  Contraseña: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_info: User;
}

export interface ConteoDetalle {
  CodigoBarras: string;
  NSistema: number;
  NExcistencia: number;
  Precio: number;
}

export interface ConteoDetalleResponse extends ConteoDetalle {
  idConteoDetalles: number;
  IdConteo: number;
  Producto: string;
  Precio: number;
}

export interface ConteoCreate {
  IdCentro: string;
  detalles: ConteoDetalle[];
}

export interface ConteoAsignar {
  IdCentro: string;
  Fechal?: string;
  IdUsuario?: number;
  detalles: ConteoDetalle[];
}

export interface ConteoResponse {
  idConteo: number;
  Fechal: string;
  FechaHora?: string | null;
  Envio: number;
  IdRealizo: number;
  IdCentro: string;
  IdUsuario: number | null;
  Estatus: number;
  detalles: ConteoDetalleResponse[];
}

export interface ConteoListResponse {
  idConteo: number;
  Fechal: string;
  FechaHora?: string | null;
  Envio: number;
  IdRealizo: number;
  IdCentro: string;
  IdUsuario: number | null;
  Estatus: number;
  total_productos: number;
}

export interface ConteoResumenDashboard {
  totalConteos: number;
  conteosPendientes: number;
  conteosNoValidados: number;
  conteosValidados: number;
  recientes: ConteoListResponse[];
}

export interface ConteoContestar {
  detalles: {
    CodigoBarras: string;
    NExcistencia?: number;
  }[];
}

export type UserRole =
  | 'administrador'
  | 'supervisor'
  | 'app'
  | 'admin_cctv'
  | 'supervision_cctv'
  | 'monitorista_soporte'
  | 'desconocido';

export interface Usuario {
  IdUser: string;
  NombreUsuario: string;
  Rol: UserRole;
}

export interface Sucursal {
  IdCentro: string;
  Sucursales: string;
  IdZona: number;
  Zona: string | null;
  IdTipoSucursal?: string;
}

export interface ApiError {
  detail: string;
  code?: string;
}

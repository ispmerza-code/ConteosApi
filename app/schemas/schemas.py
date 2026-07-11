from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import List, Optional
from enum import Enum

class UserRole(str, Enum):
    ADMINISTRADOR = "administrador"
    APP = "app"
    CCA = "cca"
    SUPERVISOR = "supervisor"

# Schemas para productos/catálogo
class ProductoBase(BaseModel):
    CodigoBarras: str = Field(..., description="Código de barras del producto")
    Producto: str = Field(..., description="Nombre del producto")
    IdMaterial: str = Field(..., description="ID del material")
    IdFamilia: int = Field(..., description="ID de la familia")
    IdCategoria: int = Field(..., description="ID de la categoría")
    IdSubcategoria: int = Field(..., description="ID de la subcategoría")

class ProductoCreate(ProductoBase):
    pass

class ProductoResponse(BaseModel):
    CodigoBarras: str
    Producto: str
    IdMaterial: str
    IdFamilia: int
    IdCategoria: int
    IdSubcategoria: int
    Familia: str
    Categoria: str
    Subcategoria: str

    class Config:
        from_attributes = True

class ProductoListResponse(BaseModel):
    items: List[ProductoResponse]
    total: int
    skip: int
    limit: int

class CatalogoFiltrosResponse(BaseModel):
    familias: List[str]
    categorias: List[str]

# Schemas para conteo detalles
class ConteoDetalleBase(BaseModel):
    CodigoBarras: str = Field(..., description="Código de barras del producto")
    NSistema: float = Field(..., description="Número de existencias en sistema")
    NExcistencia: float = Field(..., description="Número de existencias físicas")
    Precio: float = Field(..., description="Precio del producto")

class ConteoDetalleCreate(ConteoDetalleBase):
    pass

class ConteoDetalleUpdate(BaseModel):
    CodigoBarras: str = Field(..., description="Código de barras del producto")
    NExcistencia: Optional[float] = Field(None, description="Número de existencias físicas (solo para contestar)")

class ConteoDetalleResponse(ConteoDetalleBase):
    idConteoDetalles: int
    IdConteo: int
    Producto: str = Field(..., description="Nombre del producto")
    
    class Config:
        from_attributes = True

# Schemas para conteos
class ConteoBase(BaseModel):
    IdCentro: str = Field(..., description="ID del centro/sucursal")

class ConteoCreate(ConteoBase):
    """Schema para crear un nuevo conteo"""
    detalles: List[ConteoDetalleCreate] = Field(..., description="Lista de productos a contar")

class ConteoAsignar(ConteoBase):
    """Schema para asignar un conteo a una sucursal"""
    Fechal: Optional[date] = None
    IdUsuario: Optional[int] = None
    detalles: List[ConteoDetalleCreate] = Field(..., description="Lista de productos a contar")

class ConteoEdit(BaseModel):
    """Schema para editar un conteo existente"""
    Fechal: Optional[date] = None
    IdCentro: Optional[str] = None
    IdUsuario: Optional[int] = None
    detalles: Optional[List[ConteoDetalleCreate]] = None

class ConteoContestar(BaseModel):
    """Schema para contestar un conteo (modificar existencias físicas)"""
    detalles: List[ConteoDetalleUpdate] = Field(..., description="Lista de actualizaciones de existencias")

class ConteoValidarDetalle(BaseModel):
    CodigoBarras: str = Field(..., description="Código de barras del producto")
    NSistema: float = Field(..., description="Existencias en sistema (según inventario)")

class ConteoValidar(BaseModel):
    """Schema para validar un conteo (nivel 3 llena existencias sistema)"""
    detalles: List[ConteoValidarDetalle] = Field(..., description="Lista de existencias sistema por producto")

class ConteoResponse(BaseModel):
    idConteo: int
    Fechal: date
    FechaHora: Optional[datetime] = None
    Envio: int
    IdRealizo: int
    IdCentro: str
    IdUsuario: Optional[int] = None
    Estatus: int = 0
    detalles: List[ConteoDetalleResponse]
    
    class Config:
        from_attributes = True

class ConteoListResponse(BaseModel):
    idConteo: int
    Fechal: date
    FechaHora: Optional[datetime] = None
    Envio: int
    IdRealizo: int
    IdCentro: str
    IdUsuario: Optional[int] = None
    Estatus: int = 0
    total_productos: int
    
    class Config:
        from_attributes = True

class ConteoListPaginatedResponse(BaseModel):
    items: List[ConteoListResponse]
    total: int
    skip: int
    limit: int

class ConteoResumenDashboard(BaseModel):
    totalConteos: int
    conteosPendientes: int
    conteosNoValidados: int
    conteosValidados: int
    recientes: List[ConteoListResponse]

# Schemas para usuarios y autenticación
class UsuarioBase(BaseModel):
    IdUsuarios: int
    NombreUsuario: str
    NivelUsuario: int
    Estatus: int

class UsuarioLogin(BaseModel):
    IdUsuarios: int
    Contraseña: str

class UsuarioResponse(UsuarioBase):
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user_info: UsuarioResponse

class TokenData(BaseModel):
    user_id: Optional[int] = None

# Schemas para sucursales
class SucursalBase(BaseModel):
    IdCentro: str
    Sucursales: str
    IdTipoSucursal: str
    IdZona: int
    IdEstado: int
    Latitud: str
    Longitud: str
    IdMunicipio: int

class SucursalResponse(SucursalBase):
    class Config:
        from_attributes = True

# Schema para respuestas de error
class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None

# Schema para respuestas de éxito
class SuccessResponse(BaseModel):
    message: str
    data: Optional[dict] = None

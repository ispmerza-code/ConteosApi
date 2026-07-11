from sqlalchemy import Column, Integer, String, Date, DateTime, Float, ForeignKey, SmallInteger
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class CatCategoria(Base):
    __tablename__ = "catcategoria"
    
    IdCategoria = Column(Integer, primary_key=True)
    Categoria = Column(String(45), nullable=False)
    
    # Relaciones
    catalogos = relationship("Catalogo", back_populates="categoria")

class CatFamilia(Base):
    __tablename__ = "catfamilia"
    
    IdFamilia = Column(Integer, primary_key=True)
    Familia = Column(String(45), nullable=False)
    
    # Relaciones
    catalogos = relationship("Catalogo", back_populates="familia")

class CatSubcategoria(Base):
    __tablename__ = "catsubcategoria"
    
    IdCatSubcategoria = Column(Integer, primary_key=True)
    Subcategoria = Column(String(45), nullable=False)
    
    # Relaciones
    catalogos = relationship("Catalogo", back_populates="subcategoria")

class Catalogo(Base):
    __tablename__ = "catalogo"
    
    CodigoBarras = Column(String(20), primary_key=True)
    Producto = Column(String(45), nullable=False)
    IdMaterial = Column(String(20), nullable=False)
    IdFamilia = Column(Integer, ForeignKey("catfamilia.IdFamilia"), nullable=False)
    IdCategoria = Column(Integer, ForeignKey("catcategoria.IdCategoria"), nullable=False)
    IdSubcategoria = Column(Integer, ForeignKey("catsubcategoria.IdCatSubcategoria"), nullable=False)
    
    # Relaciones
    familia = relationship("CatFamilia", back_populates="catalogos")
    categoria = relationship("CatCategoria", back_populates="catalogos")
    subcategoria = relationship("CatSubcategoria", back_populates="catalogos")
    conteo_detalles = relationship("ConteoDetalles", back_populates="producto")

class Estados(Base):
    __tablename__ = "estados"
    
    IdEstado = Column(Integer, primary_key=True)
    Estado = Column(String(20))
    
    # Relaciones
    sucursales = relationship("Sucursales", back_populates="estado")

class Municipios(Base):
    __tablename__ = "municipios"
    
    idMunicipios = Column(Integer, primary_key=True)
    Municipio = Column(String(50), nullable=False)
    
    # Relaciones
    sucursales = relationship("Sucursales", back_populates="municipio")

class TipoSucursal(Base):
    __tablename__ = "tiposucursal"
    
    IdTipoSucursal = Column(String(1), primary_key=True)
    TipoSucursal = Column(String(16), nullable=False)
    
    # Relaciones
    sucursales = relationship("Sucursales", back_populates="tipo_sucursal")

class Zonas(Base):
    __tablename__ = "zonas"
    
    idZona = Column(Integer, primary_key=True)
    Zona = Column(String(13), nullable=False)
    
    # Relaciones
    sucursales = relationship("Sucursales", back_populates="zona")

class Sucursales(Base):
    __tablename__ = "sucursales"
    
    IdCentro = Column(String(4), primary_key=True)
    Sucursales = Column(String(30), nullable=False)
    IdTipoSucursal = Column(String(1), ForeignKey("tiposucursal.IdTipoSucursal"), nullable=False)
    IdZona = Column(Integer, ForeignKey("zonas.idZona"), nullable=False)
    IdEstado = Column(Integer, ForeignKey("estados.IdEstado"), nullable=False)
    Latitud = Column(String(20), nullable=False)
    Longitud = Column(String(20), nullable=False)
    IdMunicipio = Column(Integer, ForeignKey("municipios.idMunicipios"), nullable=False)
    
    # Relaciones
    estado = relationship("Estados", back_populates="sucursales")
    municipio = relationship("Municipios", back_populates="sucursales")
    tipo_sucursal = relationship("TipoSucursal", back_populates="sucursales")
    zona = relationship("Zonas", back_populates="sucursales")
    conteos = relationship("Conteo", back_populates="sucursal")
    usuarios_asignados = relationship("UsuarioSucursal", back_populates="sucursal")

class NivelUsuarios(Base):
    __tablename__ = "nivelusuarios"
    
    IdNivelUsuario = Column(Integer, primary_key=True)
    NivelUsuario = Column(String(20), nullable=False)
    
    # Relaciones
    usuarios = relationship("Usuarios", back_populates="nivel_usuario")

class Usuarios(Base):
    __tablename__ = "usuarios"
    
    IdUsuarios = Column(Integer, primary_key=True)
    NombreUsuario = Column(String(45), nullable=False)
    Contraseña = Column(String(25), nullable=False)
    NivelUsuario = Column(Integer, ForeignKey("nivelusuarios.IdNivelUsuario"), nullable=False)
    Estatus = Column(SmallInteger, nullable=False)
    
    # Relaciones
    nivel_usuario = relationship("NivelUsuarios", back_populates="usuarios")
    conteos_realizados = relationship("Conteo", foreign_keys="Conteo.IdRealizo", back_populates="usuario_realizo")
    conteos_asignados = relationship("Conteo", foreign_keys="Conteo.IdUsuario", back_populates="usuario_asignado")
    sucursales_asignadas = relationship("UsuarioSucursal", back_populates="usuario")

class Conteo(Base):
    __tablename__ = "conteo"
    
    idConteo = Column(Integer, primary_key=True, autoincrement=True)
    Fechal = Column(Date, nullable=False)
    FechaHora = Column(DateTime, nullable=True)
    Envio = Column(SmallInteger, nullable=False)
    IdRealizo = Column(Integer, ForeignKey("usuarios.IdUsuarios"), nullable=False)
    IdCentro = Column(String(4), ForeignKey("sucursales.IdCentro"), nullable=False)
    IdUsuario = Column(Integer, ForeignKey("usuarios.IdUsuarios"), nullable=True)
    Estatus = Column(SmallInteger, nullable=False, default=0)
    
    # Relaciones
    sucursal = relationship("Sucursales", back_populates="conteos")
    usuario_realizo = relationship("Usuarios", foreign_keys=[IdRealizo], back_populates="conteos_realizados")
    usuario_asignado = relationship("Usuarios", foreign_keys=[IdUsuario], back_populates="conteos_asignados")
    detalles = relationship("ConteoDetalles", back_populates="conteo", cascade="all, delete-orphan")

class ConteoDetalles(Base):
    __tablename__ = "conteodetalles"
    
    idConteoDetalles = Column(Integer, primary_key=True, autoincrement=True)
    IdConteo = Column(Integer, ForeignKey("conteo.idConteo"), nullable=False)
    CodigoBarras = Column(String(20), ForeignKey("catalogo.CodigoBarras"), nullable=False)
    NSistema = Column(Float, nullable=False)
    NExcistencia = Column(Float, nullable=False)
    Precio = Column(Float, nullable=False)
    
    # Relaciones
    conteo = relationship("Conteo", back_populates="detalles")
    producto = relationship("Catalogo", back_populates="conteo_detalles")

class UsuarioSucursal(Base):
    __tablename__ = "usuariossucursal"
    __table_args__ = {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_0900_ai_ci"}

    idUsuariosSucursa = Column(Integer, primary_key=True, autoincrement=True)
    IdUsuario = Column(Integer, ForeignKey("usuarios.IdUsuarios"), nullable=False)
    IdCentro = Column(String(4), ForeignKey("sucursales.IdCentro"), nullable=True)

    # Relaciones
    usuario = relationship("Usuarios", back_populates="sucursales_asignadas")
    sucursal = relationship("Sucursales", back_populates="usuarios_asignados")

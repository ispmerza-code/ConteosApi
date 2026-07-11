from datetime import date, datetime
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func, or_, cast, String
from fastapi import HTTPException, status
from app.models.models import Conteo, ConteoDetalles, Usuarios, Sucursales, Catalogo
from app.schemas.schemas import (
    ConteoCreate, ConteoAsignar, ConteoEdit, ConteoContestar, ConteoValidar,
    ConteoResponse, ConteoListResponse, ConteoResumenDashboard, ConteoDetalleCreate
)

class ConteoService:
    
    @staticmethod
    def crear_conteo(
        db: Session,
        conteo_data: ConteoCreate,
        user_id: int,
        user_nivel: int = 0
    ) -> ConteoResponse:
        """Crear un nuevo conteo"""
        
        # Verificar que la sucursal existe
        sucursal = db.query(Sucursales).filter(Sucursales.IdCentro == conteo_data.IdCentro).first()
        if not sucursal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sucursal {conteo_data.IdCentro} no encontrada"
            )
        
        # Verificar que todos los productos existen
        # Normalizar códigos de barras: asegurar string y quitar espacios alrededor
        codigos_barras = [str(detalle.CodigoBarras).strip() for detalle in conteo_data.detalles]
        productos_existentes = db.query(Catalogo.CodigoBarras).filter(
            Catalogo.CodigoBarras.in_(codigos_barras)
        ).all()
        productos_existentes = [p[0] for p in productos_existentes]
        
        productos_no_encontrados = set(codigos_barras) - set(productos_existentes)
        if productos_no_encontrados:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Productos no encontrados: {', '.join(productos_no_encontrados)}"
            )
        
        # Crear el conteo principal
        nuevo_conteo = Conteo(
            Fechal=date.today(),
            FechaHora=datetime.now(),
            Envio=1,  # Por defecto finalizado al crear
            IdRealizo=user_id,
            IdCentro=conteo_data.IdCentro,
            IdUsuario=None,
            Estatus=0
        )
        
        db.add(nuevo_conteo)
        db.flush()  # Para obtener el ID
        
        # Crear los detalles del conteo
        # Si el usuario es nivel 4 (APP), NSistema siempre es 0 (lo valida nivel 3 después)
        forzar_nsistema_cero = (user_nivel == 4)
        for detalle in conteo_data.detalles:
            nuevo_detalle = ConteoDetalles(
                IdConteo=nuevo_conteo.idConteo,
                CodigoBarras=detalle.CodigoBarras,
                NSistema=0.0 if forzar_nsistema_cero else detalle.NSistema,
                NExcistencia=detalle.NExcistencia,
                Precio=detalle.Precio
            )
            db.add(nuevo_detalle)
        
        db.commit()
        db.refresh(nuevo_conteo)
        
        return ConteoService._build_conteo_response(db, nuevo_conteo)
    
    @staticmethod
    def asignar_conteo(
        db: Session,
        conteo_data: ConteoAsignar,
        user_id: int
    ) -> ConteoResponse:
        """Asignar un conteo a otro usuario"""
        
        # Determinar el usuario asignado (null si no se especifica)
        id_usuario_asignado = conteo_data.IdUsuario
        
        # Verificar que el usuario asignado existe (solo si se especificó uno)
        if id_usuario_asignado is not None:
            usuario_asignado = db.query(Usuarios).filter(
                Usuarios.IdUsuarios == id_usuario_asignado,
                Usuarios.Estatus == 1
            ).first()
            if not usuario_asignado:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Usuario {id_usuario_asignado} no encontrado o inactivo"
                )
        
        # Verificar que la sucursal existe
        sucursal = db.query(Sucursales).filter(Sucursales.IdCentro == conteo_data.IdCentro).first()
        if not sucursal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sucursal {conteo_data.IdCentro} no encontrada"
            )
        
        # Verificar que todos los productos existen
        # Normalizar códigos de barras: asegurar string y quitar espacios alrededor
        codigos_barras = [str(detalle.CodigoBarras).strip() for detalle in conteo_data.detalles]
        productos_existentes = db.query(Catalogo.CodigoBarras).filter(
            Catalogo.CodigoBarras.in_(codigos_barras)
        ).all()
        productos_existentes = [p[0] for p in productos_existentes]
        
        productos_no_encontrados = set(codigos_barras) - set(productos_existentes)
        if productos_no_encontrados:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Productos no encontrados: {', '.join(productos_no_encontrados)}"
            )
        
        # Validar que la fecha no sea anterior a hoy
        fecha_conteo = conteo_data.Fechal or date.today()
        if fecha_conteo < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha del conteo no puede ser anterior a hoy"
            )
        
        # Crear el conteo asignado
        nuevo_conteo = Conteo(
            Fechal=fecha_conteo,
            FechaHora=datetime.now(),
            Envio=0,  # Pendiente porque se asigna
            IdRealizo=user_id,
            IdCentro=conteo_data.IdCentro,
            IdUsuario=id_usuario_asignado,
            Estatus=0
        )
        
        try:
            db.add(nuevo_conteo)
            db.flush()
            
            # Crear los detalles del conteo
            for detalle in conteo_data.detalles:
                nuevo_detalle = ConteoDetalles(
                    IdConteo=nuevo_conteo.idConteo,
                    CodigoBarras=detalle.CodigoBarras,
                    NSistema=detalle.NSistema,
                    NExcistencia=detalle.NExcistencia,
                    Precio=detalle.Precio
                )
                db.add(nuevo_detalle)
            
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al guardar el conteo: {str(e)}"
            )
        
        db.refresh(nuevo_conteo)
        
        return ConteoService._build_conteo_response(db, nuevo_conteo)
    
    @staticmethod
    def editar_conteo(
        db: Session,
        conteo_id: int,
        conteo_data: ConteoEdit,
        user_id: int
    ) -> ConteoResponse:
        """Editar un conteo existente"""
        
        # Obtener el conteo
        conteo = db.query(Conteo).filter(Conteo.idConteo == conteo_id).first()
        if not conteo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conteo no encontrado"
            )
        
        # Verificar que el conteo esté pendiente (Envio = 0)
        if conteo.Envio == 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede editar un conteo que ya ha sido finalizado"
            )
        
        # Actualizar campos del conteo principal
        if conteo_data.Fechal is not None:
            if conteo_data.Fechal < date.today():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La fecha del conteo no puede ser anterior a hoy"
                )
            conteo.Fechal = conteo_data.Fechal
        
        if conteo_data.IdCentro is not None:
            sucursal = db.query(Sucursales).filter(Sucursales.IdCentro == conteo_data.IdCentro).first()
            if not sucursal:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Sucursal {conteo_data.IdCentro} no encontrada"
                )
            conteo.IdCentro = conteo_data.IdCentro
        
        if conteo_data.IdUsuario is not None:
            usuario = db.query(Usuarios).filter(
                Usuarios.IdUsuarios == conteo_data.IdUsuario,
                Usuarios.Estatus == 1
            ).first()
            if not usuario:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Usuario {conteo_data.IdUsuario} no encontrado o inactivo"
                )
            conteo.IdUsuario = conteo_data.IdUsuario
        
        # Actualizar detalles si se proporcionan
        if conteo_data.detalles is not None:
            # Eliminar detalles existentes
            db.query(ConteoDetalles).filter(ConteoDetalles.IdConteo == conteo_id).delete()
            
            # Verificar que todos los productos existen
            # Normalizar códigos de barras: asegurar string y quitar espacios alrededor
            codigos_barras = [str(detalle.CodigoBarras).strip() for detalle in conteo_data.detalles]
            productos_existentes = db.query(Catalogo.CodigoBarras).filter(
                Catalogo.CodigoBarras.in_(codigos_barras)
            ).all()
            productos_existentes = [p[0] for p in productos_existentes]
            
            productos_no_encontrados = set(codigos_barras) - set(productos_existentes)
            if productos_no_encontrados:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Productos no encontrados: {', '.join(productos_no_encontrados)}"
                )
            
            # Crear nuevos detalles
            for detalle in conteo_data.detalles:
                nuevo_detalle = ConteoDetalles(
                    IdConteo=conteo_id,
                    CodigoBarras=detalle.CodigoBarras,
                    NSistema=detalle.NSistema,
                    NExcistencia=detalle.NExcistencia,
                    Precio=detalle.Precio
                )
                db.add(nuevo_detalle)
        
        db.commit()
        db.refresh(conteo)
        
        return ConteoService._build_conteo_response(db, conteo)
    
    @staticmethod
    def contestar_conteo(
        db: Session,
        conteo_id: int,
        conteo_data: ConteoContestar,
        user_id: int
    ) -> ConteoResponse:
        """Contestar un conteo (actualizar existencias físicas)"""
        
        # Obtener el conteo
        conteo = db.query(Conteo).filter(Conteo.idConteo == conteo_id).first()
        if not conteo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conteo no encontrado"
            )
        
        # Verificar que el conteo esté pendiente
        if conteo.Envio == 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este conteo ya ha sido contestado"
            )
        
        # Nivel 4 (APP): solo puede contestar conteos de sus sucursales asignadas
        usuario = db.query(Usuarios).filter(Usuarios.IdUsuarios == user_id).first()
        if usuario and usuario.NivelUsuario == 4:
            from app.models.models import UsuarioSucursal
            centros_asignados = db.query(UsuarioSucursal.IdCentro).filter(
                UsuarioSucursal.IdUsuario == user_id,
                UsuarioSucursal.IdCentro.isnot(None)
            ).all()
            centros_ids = [c[0] for c in centros_asignados]
            if conteo.IdCentro not in centros_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permiso para contestar conteos de esta sucursal"
                )
        
        # Actualizar existencias físicas
        for detalle_update in conteo_data.detalles:
            if detalle_update.NExcistencia is not None:
                # Buscar el detalle por código de barras
                detalle = db.query(ConteoDetalles).filter(
                    and_(
                        ConteoDetalles.IdConteo == conteo_id,
                        ConteoDetalles.CodigoBarras == detalle_update.CodigoBarras
                    )
                ).first()
                
                if detalle:
                    detalle.NExcistencia = detalle_update.NExcistencia
        
        # Marcar el conteo como finalizado y contestado
        conteo.Envio = 1
        conteo.Estatus = 1
        conteo.IdUsuario = user_id  # Registrar quién realizó el conteo
        
        db.commit()
        db.refresh(conteo)
        
        return ConteoService._build_conteo_response(db, conteo)
    
    @staticmethod
    def validar_conteo(
        db: Session,
        conteo_id: int,
        conteo_data: ConteoValidar,
        user_id: int
    ) -> ConteoResponse:
        """Validar un conteo: nivel 3 llena las existencias sistema y lo marca como validado"""

        conteo = db.query(Conteo).filter(Conteo.idConteo == conteo_id).first()
        if not conteo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conteo no encontrado"
            )

        # Solo se puede validar un conteo sin validar (Envio=1, Estatus=0)
        if conteo.Envio != 1 or conteo.Estatus != 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo se pueden validar conteos en estado 'Sin Validar'"
            )

        # Actualizar NSistema por código de barras
        for detalle_update in conteo_data.detalles:
            detalle = db.query(ConteoDetalles).filter(
                and_(
                    ConteoDetalles.IdConteo == conteo_id,
                    ConteoDetalles.CodigoBarras == detalle_update.CodigoBarras
                )
            ).first()
            if detalle:
                detalle.NSistema = detalle_update.NSistema

        # Marcar como validado
        conteo.Estatus = 1

        db.commit()
        db.refresh(conteo)

        return ConteoService._build_conteo_response(db, conteo)

    @staticmethod
    def eliminar_conteo(db: Session, conteo_id: int, user_id: int) -> dict:
        """Eliminar un conteo (solo administradores)"""
        
        conteo = db.query(Conteo).filter(Conteo.idConteo == conteo_id).first()
        if not conteo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conteo no encontrado"
            )
        
        # Eliminar detalles primero (por las llaves foráneas)
        db.query(ConteoDetalles).filter(ConteoDetalles.IdConteo == conteo_id).delete()
        
        # Eliminar el conteo
        db.delete(conteo)
        db.commit()
        
        return {"message": f"Conteo {conteo_id} eliminado exitosamente"}

    @staticmethod
    def reasignar_conteo(db: Session, conteo_id: int, user_id: int) -> ConteoResponse:
        """Reasignar un conteo: marcar como pendiente (Envio=0), limpiar existencias a 0 y desasignar usuario.

        Esto permite volver a asignar/editar las existencias en sistema y físicas.
        """
        origen = db.query(Conteo).filter(Conteo.idConteo == conteo_id).first()
        if not origen:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conteo no encontrado"
            )

        # Crear un nuevo conteo basado en el original pero en estado pendiente
        nuevo_conteo = Conteo(
            Fechal=date.today(),
            FechaHora=datetime.now(),
            Envio=0,  # pendiente
            IdRealizo=user_id,
            IdCentro=origen.IdCentro,
            IdUsuario=None,
            Estatus=0
        )
        db.add(nuevo_conteo)
        db.flush()

        # Copiar detalles pero con existencias en cero
        detalles_origen = db.query(ConteoDetalles).filter(ConteoDetalles.IdConteo == conteo_id).all()
        for d in detalles_origen:
            nuevo_detalle = ConteoDetalles(
                IdConteo=nuevo_conteo.idConteo,
                CodigoBarras=d.CodigoBarras,
                NSistema=0.0,
                NExcistencia=0.0,
                Precio=d.Precio
            )
            db.add(nuevo_detalle)

        db.commit()
        db.refresh(nuevo_conteo)

        return ConteoService._build_conteo_response(db, nuevo_conteo)
    
    @staticmethod
    def obtener_conteo(
        db: Session,
        conteo_id: int,
        allowed_centros: Optional[List[str]] = None
    ) -> ConteoResponse:
        """Obtener un conteo por ID.
        Si allowed_centros no es None, verifica que el conteo pertenezca a una sucursal permitida.
        """
        conteo = db.query(Conteo).filter(Conteo.idConteo == conteo_id).first()
        if not conteo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conteo no encontrado"
            )

        if allowed_centros is not None and conteo.IdCentro not in allowed_centros:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes acceso a este conteo"
            )

        return ConteoService._build_conteo_response(db, conteo)
    
    @staticmethod
    def _apply_list_filters(
        query,
        id_centro: Optional[str] = None,
        envio: Optional[int] = None,
        estatus: Optional[int] = None,
        id_usuario: Optional[int] = None,
        allowed_centros: Optional[List[str]] = None,
        q: Optional[str] = None,
        centro: Optional[str] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None,
        join_sucursal: bool = False,
    ):
        if join_sucursal:
            query = query.outerjoin(Sucursales, Conteo.IdCentro == Sucursales.IdCentro)

        if allowed_centros is not None:
            query = query.filter(Conteo.IdCentro.in_(allowed_centros))
        if id_centro:
            query = query.filter(Conteo.IdCentro == id_centro)
        if envio is not None:
            query = query.filter(Conteo.Envio == envio)
        if estatus is not None:
            query = query.filter(Conteo.Estatus == estatus)
        if id_usuario:
            query = query.filter(Conteo.IdUsuario == id_usuario)
        if fecha_desde:
            query = query.filter(Conteo.Fechal >= fecha_desde)
        if fecha_hasta:
            query = query.filter(Conteo.Fechal <= fecha_hasta)

        if q:
            term = f"%{q.strip()}%"
            clauses = [
                Conteo.IdCentro.like(term),
                cast(Conteo.idConteo, String).like(term),
                cast(Conteo.IdUsuario, String).like(term),
            ]
            if join_sucursal:
                clauses.append(Sucursales.Sucursales.like(term))
            if q.strip().isdigit():
                num = int(q.strip())
                clauses.append(Conteo.idConteo == num)
                clauses.append(Conteo.IdUsuario == num)
            query = query.filter(or_(*clauses))

        if centro:
            term = f"%{centro.strip()}%"
            centro_clauses = [Conteo.IdCentro.like(term)]
            if join_sucursal:
                centro_clauses.append(Sucursales.Sucursales.like(term))
            query = query.filter(or_(*centro_clauses))

        return query

    @staticmethod
    def _rows_to_list_response(rows) -> List[ConteoListResponse]:
        return [
            ConteoListResponse(
                idConteo=conteo.idConteo,
                Fechal=conteo.Fechal,
                FechaHora=conteo.FechaHora,
                Envio=conteo.Envio,
                IdRealizo=conteo.IdRealizo,
                IdCentro=conteo.IdCentro,
                IdUsuario=conteo.IdUsuario,
                Estatus=conteo.Estatus if conteo.Estatus is not None else 0,
                total_productos=int(total_productos or 0),
            )
            for conteo, total_productos in rows
        ]

    @staticmethod
    def _build_list_query(db: Session):
        counts_subq = (
            db.query(
                ConteoDetalles.IdConteo.label("conteo_id"),
                func.count(ConteoDetalles.idConteoDetalles).label("total_productos"),
            )
            .group_by(ConteoDetalles.IdConteo)
            .subquery()
        )
        return db.query(
            Conteo,
            func.coalesce(counts_subq.c.total_productos, 0).label("total_productos"),
        ).outerjoin(counts_subq, Conteo.idConteo == counts_subq.c.conteo_id)

    @staticmethod
    def obtener_resumen_dashboard(
        db: Session,
        id_centro: Optional[str] = None,
        allowed_centros: Optional[List[str]] = None,
    ) -> ConteoResumenDashboard:
        """Conteos agregados para el dashboard en pocas consultas SQL."""
        base = db.query(Conteo)
        base = ConteoService._apply_list_filters(
            base, id_centro=id_centro, allowed_centros=allowed_centros
        )

        total = base.count()
        pendientes = base.filter(Conteo.Envio == 0).count()
        no_validados = base.filter(Conteo.Estatus == 0).count()
        validados = base.filter(Conteo.Estatus == 1).count()

        recientes = ConteoService.listar_conteos(
            db=db,
            skip=0,
            limit=5,
            id_centro=id_centro,
            allowed_centros=allowed_centros,
        )

        return ConteoResumenDashboard(
            totalConteos=total,
            conteosPendientes=pendientes,
            conteosNoValidados=no_validados,
            conteosValidados=validados,
            recientes=recientes,
        )

    @staticmethod
    def listar_conteos_con_detalles(
        db: Session,
        id_centro: Optional[str] = None,
        allowed_centros: Optional[List[str]] = None,
    ) -> List[ConteoResponse]:
        """Lista conteos con detalles en una sola consulta (estadísticas)."""
        query = db.query(Conteo).options(
            joinedload(Conteo.detalles).joinedload(ConteoDetalles.producto)
        )
        query = ConteoService._apply_list_filters(
            query, id_centro=id_centro, allowed_centros=allowed_centros
        )
        query = query.order_by(Conteo.Fechal.desc(), Conteo.idConteo.desc())
        conteos = query.all()
        return [ConteoService._build_conteo_response_from_loaded(conteo) for conteo in conteos]
    
    @staticmethod
    def listar_conteos(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        id_centro: Optional[str] = None,
        envio: Optional[int] = None,
        id_usuario: Optional[int] = None,
        allowed_centros: Optional[List[str]] = None
    ) -> List[ConteoListResponse]:
        """Listar conteos con filtros opcionales.
        allowed_centros: si no es None, restringe a esas sucursales (usuarios nivel 2 y 4).
        """
        result = ConteoService.listar_conteos_paginados(
            db=db,
            skip=skip,
            limit=limit,
            id_centro=id_centro,
            envio=envio,
            id_usuario=id_usuario,
            allowed_centros=allowed_centros,
        )
        return result["items"]

    @staticmethod
    def listar_conteos_paginados(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        id_centro: Optional[str] = None,
        envio: Optional[int] = None,
        estatus: Optional[int] = None,
        id_usuario: Optional[int] = None,
        allowed_centros: Optional[List[str]] = None,
        q: Optional[str] = None,
        centro: Optional[str] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None,
        orden: str = "desc",
    ) -> dict:
        """Listado paginado de conteos con filtros avanzados."""
        join_sucursal = bool((q and q.strip()) or (centro and centro.strip()))
        query = ConteoService._build_list_query(db)
        query = ConteoService._apply_list_filters(
            query,
            id_centro=id_centro,
            envio=envio,
            estatus=estatus,
            id_usuario=id_usuario,
            allowed_centros=allowed_centros,
            q=q,
            centro=centro,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            join_sucursal=join_sucursal,
        )

        total = query.with_entities(func.count(Conteo.idConteo)).scalar() or 0

        if orden == "asc":
            query = query.order_by(Conteo.Fechal.asc(), Conteo.idConteo.asc())
        else:
            query = query.order_by(Conteo.Fechal.desc(), Conteo.idConteo.desc())

        rows = query.offset(skip).limit(limit).all()
        return {
            "items": ConteoService._rows_to_list_response(rows),
            "total": total,
            "skip": skip,
            "limit": limit,
        }
    
    @staticmethod
    def _build_conteo_response_from_loaded(conteo: Conteo) -> ConteoResponse:
        """Construye respuesta usando relaciones ya cargadas (sin queries extra)."""
        detalles = []
        for detalle in conteo.detalles:
            producto_nombre = detalle.producto.Producto if detalle.producto else "Sin nombre"
            detalles.append({
                "idConteoDetalles": detalle.idConteoDetalles,
                "IdConteo": detalle.IdConteo,
                "CodigoBarras": detalle.CodigoBarras,
                "NSistema": detalle.NSistema,
                "NExcistencia": detalle.NExcistencia,
                "Precio": detalle.Precio,
                "Producto": producto_nombre,
            })

        return ConteoResponse(
            idConteo=conteo.idConteo,
            Fechal=conteo.Fechal,
            FechaHora=conteo.FechaHora,
            Envio=conteo.Envio,
            IdRealizo=conteo.IdRealizo,
            IdCentro=conteo.IdCentro,
            IdUsuario=conteo.IdUsuario,
            Estatus=conteo.Estatus if conteo.Estatus is not None else 0,
            detalles=detalles,
        )

    @staticmethod
    def _build_conteo_response(db: Session, conteo: Conteo) -> ConteoResponse:
        """Construir respuesta completa del conteo con detalles"""
        
        # Hacer join con Catalogo para obtener el nombre del producto
        detalles_query = db.query(
            ConteoDetalles,
            Catalogo.Producto
        ).join(
            Catalogo,
            ConteoDetalles.CodigoBarras == Catalogo.CodigoBarras
        ).filter(
            ConteoDetalles.IdConteo == conteo.idConteo
        ).all()
        
        # Construir lista de detalles con el nombre del producto
        detalles = []
        for detalle, producto_nombre in detalles_query:
            detalle_dict = {
                "idConteoDetalles": detalle.idConteoDetalles,
                "IdConteo": detalle.IdConteo,
                "CodigoBarras": detalle.CodigoBarras,
                "NSistema": detalle.NSistema,
                "NExcistencia": detalle.NExcistencia,
                "Precio": detalle.Precio,
                "Producto": producto_nombre
            }
            detalles.append(detalle_dict)
        
        return ConteoResponse(
            idConteo=conteo.idConteo,
            Fechal=conteo.Fechal,
            FechaHora=conteo.FechaHora,
            Envio=conteo.Envio,
            IdRealizo=conteo.IdRealizo,
            IdCentro=conteo.IdCentro,
            IdUsuario=conteo.IdUsuario,
            Estatus=conteo.Estatus if conteo.Estatus is not None else 0,
            detalles=detalles
        )

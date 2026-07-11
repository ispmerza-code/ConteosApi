"""
Copia los permisos de un usuario origen a un usuario destino.
Uso: python copiar_permisos.py
Requiere DATABASE_URL como variable de entorno o en archivo .env
"""
import os
import sys
from sqlalchemy import create_engine, text

# ─── Configuración ────────────────────────────────────────────────────────────
USUARIO_ORIGEN  = "estefania castillo avalos"   # Nombre (sin importar mayúsculas)
USUARIO_DESTINO = "marco antonio ruiz zarate"
# ──────────────────────────────────────────────────────────────────────────────

# Cargar .env si existe
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: Define DATABASE_URL como variable de entorno.")
    print("Ejemplo:")
    print('  $env:DATABASE_URL="mysql+pymysql://user:pass@host:port/db"')
    sys.exit(1)

engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    # ── Buscar usuarios ───────────────────────────────────────────────────────
    def buscar(nombre):
        row = conn.execute(
            text("SELECT IdUsuarios, NombreUsuario, NivelUsuario FROM usuarios "
                 "WHERE LOWER(NombreUsuario) LIKE :n LIMIT 1"),
            {"n": f"%{nombre.lower()}%"}
        ).fetchone()
        return row

    origen  = buscar(USUARIO_ORIGEN)
    destino = buscar(USUARIO_DESTINO)

    if not origen:
        print(f"ERROR: No se encontró el usuario origen: '{USUARIO_ORIGEN}'")
        sys.exit(1)
    if not destino:
        print(f"ERROR: No se encontró el usuario destino: '{USUARIO_DESTINO}'")
        sys.exit(1)

    print(f"\nOrigen  → ID {origen[0]:5}  Nivel {origen[2]}  {origen[1]}")
    print(f"Destino → ID {destino[0]:5}  Nivel actual {destino[2]}  {destino[1]}")

    # ── Sucursales del origen ─────────────────────────────────────────────────
    sucursales_origen = conn.execute(
        text("SELECT IdCentro FROM usuariossucursal WHERE IdUsuario = :id"),
        {"id": origen[0]}
    ).fetchall()
    sucursales_destino_existentes = {
        r[0] for r in conn.execute(
            text("SELECT IdCentro FROM usuariossucursal WHERE IdUsuario = :id"),
            {"id": destino[0]}
        ).fetchall()
    }

    print(f"\nSucursales de origen : {[r[0] for r in sucursales_origen] or 'ninguna'}")
    print(f"Sucursales de destino: {list(sucursales_destino_existentes) or 'ninguna'}")

    confirmacion = input("\n¿Aplicar cambios? (s/n): ").strip().lower()
    if confirmacion != "s":
        print("Cancelado.")
        sys.exit(0)

    # ── 1. Actualizar NivelUsuario ────────────────────────────────────────────
    conn.execute(
        text("UPDATE usuarios SET NivelUsuario = :nivel WHERE IdUsuarios = :id"),
        {"nivel": origen[2], "id": destino[0]}
    )
    print(f"\n✓ NivelUsuario actualizado a {origen[2]}")

    # ── 2. Copiar sucursales que el destino aún no tiene ─────────────────────
    nuevas = 0
    for (centro,) in sucursales_origen:
        if centro not in sucursales_destino_existentes:
            conn.execute(
                text("INSERT INTO usuariossucursal (IdUsuario, IdCentro) VALUES (:u, :c)"),
                {"u": destino[0], "c": centro}
            )
            nuevas += 1
    print(f"✓ Sucursales copiadas: {nuevas} nuevas")

    print("\nListo. Los cambios fueron guardados en la base de datos.")

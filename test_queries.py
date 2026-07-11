from sqlalchemy import text
from app.core.database import engine

def show_tables(conn):
    res = conn.execute(text("SHOW TABLES"))
    tables = [row[0] for row in res]
    return tables

def show_sample(conn, table, limit=5):
    try:
        res = conn.execute(text(f"SELECT * FROM `{table}` LIMIT :limit"), {"limit": limit})
        cols = res.keys()
        rows = res.fetchall()
        return cols, rows
    except Exception as e:
        return None, str(e)

def main():
    try:
        with engine.connect() as conn:
            print("Conectado a la base de datos.")
            tables = show_tables(conn)
            if not tables:
                print("No se encontraron tablas.")
                return
            print("Tablas encontradas:")
            for t in tables:
                print(" -", t)

            first = tables[0]
            print(f"\nMostrando hasta 5 filas de la tabla: {first}\n")
            cols, rows = show_sample(conn, first)
            if cols is None:
                print("Error al obtener filas:", rows)
                return
            print("Columnas:", cols)
            for r in rows:
                print(r)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()

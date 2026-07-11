# Guía de Deployment para Azure App Service

## 📋 Archivos de configuración creados:
- ✅ `startup.txt` - Comando de inicio para Azure App Service
- ✅ `requirements.txt` - Actualizado con gunicorn y cryptography
- ✅ `Procfile` - Para plataformas alternativas (Heroku, Railway)
- ✅ `runtime.txt` - Especifica Python 3.11

## 🚀 Pasos para desplegar en Azure App Service:

### 1. Crear Base de Datos MySQL en Azure
Ve a Azure Portal y crea:
- **Azure Database for MySQL Flexible Server**
- Anota: Host, Usuario, Contraseña, Nombre de BD

### 2. Crear App Service
```bash
# Usando Azure CLI (o usa el Portal de Azure)
az webapp up --name conteos-api --resource-group tu-resource-group --runtime "PYTHON:3.11"
```

### 3. Configurar Variables de Entorno en Azure
Ve a: **App Service → Configuration → Application settings**

Agrega estas variables:
```
DATABASE_URL=mysql+pymysql://usuario:password@host.mysql.database.azure.com:3306/siniestros_scisp?ssl_ca=/etc/ssl/certs/ca-certificates.crt
SECRET_KEY=genera_una_clave_secreta_muy_segura_de_32_caracteres_minimo
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
PROJECT_NAME=API Conteos SCISP
PROJECT_VERSION=1.0.0
```

⚠️ **IMPORTANTE:** Para MySQL en Azure, agrega el parámetro SSL al final de DATABASE_URL

### 4. Configurar Startup Command
Ve a: **App Service → Configuration → General settings → Startup Command**

Deja vacío (usará `startup.txt` automáticamente) o usa:
```
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind=0.0.0.0:8000 --timeout 600
```

### 5. Desplegar desde GitHub
**Opción A: Deployment Center (Recomendado)**
1. Ve a: **App Service → Deployment Center**
2. Source: GitHub
3. Selecciona: Mark0Ruiz/Conteos-API
4. Branch: main
5. Build Provider: GitHub Actions (se auto-configura)

**Opción B: Git Push directo**
```bash
git remote add azure https://<deployment-username>@<app-name>.scm.azurewebsites.net/<app-name>.git
git push azure main
```

### 6. Permitir conexiones de red
**App Service → Networking → Outbound traffic**
- Habilita la IP del App Service en el Firewall de MySQL

**MySQL → Networking → Firewall rules**
- Agrega la IP del App Service o habilita "Allow Azure services"

### 7. Verificar deployment
```
https://<tu-app-name>.azurewebsites.net/
https://<tu-app-name>.azurewebsites.net/docs
```

## 🔧 Solución de problemas:

### Ver logs en tiempo real:
```bash
az webapp log tail --name conteos-api --resource-group tu-resource-group
```

O ve a: **App Service → Log stream**

### Si hay errores de conexión a MySQL:
1. Verifica que el SSL esté configurado en DATABASE_URL
2. Verifica firewall de MySQL
3. Verifica que las credenciales sean correctas

### Si la app no inicia:
1. Ve a **Diagnose and solve problems**
2. Revisa los logs en **Log stream**
3. Verifica que todas las variables de entorno estén configuradas

## 📝 Configuración de CORS para producción:
Actualiza `main.py` con la URL de tu frontend en Vercel:
```python
allow_origins=[
    "https://tu-app-frontend.vercel.app",
    "http://localhost:3000"  # Para desarrollo
]
```

## 💡 Tips:
- **Free Tier:** Azure ofrece un tier gratuito limitado
- **Scale up:** Puedes escalar verticalmente desde el portal
- **Always On:** Habilita esta opción para que no se duerma la app
- **Health check:** Configura health check endpoint en `/`
- **Monitoring:** Usa Application Insights para monitoreo

## 🔐 Seguridad:
- Genera un SECRET_KEY fuerte: `python -c "import secrets; print(secrets.token_hex(32))"`
- Nunca subas `.env` a GitHub
- Usa Azure Key Vault para secretos sensibles en producción

## 🌐 Conectar con Frontend (Vercel):
Una vez desplegado, actualiza en Vercel:
```
NEXT_PUBLIC_API_URL=https://conteos-api.azurewebsites.net
```

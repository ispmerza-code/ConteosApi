# Script PowerShell para preparar entorno de desarrollo y arrancar la app
param(
    [switch]$InstallDeps = $true,
    [switch]$RunSeed = $true,
    [switch]$RunServer = $true
)

Write-Host "Preparando entorno de desarrollo..."

if (-not (Test-Path -Path .venv)) {
    Write-Host "Creando entorno virtual .venv..."
    python -m venv .venv
}

Write-Host "Activando entorno virtual..."
. .\.venv\Scripts\Activate.ps1

if ($InstallDeps) {
    Write-Host "Actualizando pip e instalando dependencias..."
    python -m pip install --upgrade pip
    pip install -r requirements.txt
}

if ($RunSeed) {
    Write-Host "Ejecutando seed de desarrollo (seed_dev.py)..."
    python seed_dev.py
}

if ($RunServer) {
    Write-Host "Arrancando servidor en http://127.0.0.1:8000 (CTRL+C para parar)..."
    python run_dev.py
}

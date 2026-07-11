#!/bin/bash
# Script de deployment para Azure App Service
# Este script fuerza la instalación de dependencias

echo "Installing dependencies..."
python -m pip install --upgrade pip
pip install -r requirements.txt

echo "Starting application..."
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind=0.0.0.0:8000 --timeout 600

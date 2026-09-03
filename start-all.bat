@echo off
title Billing - Start All Services
echo ===============================================
echo  Starting all billing services...
echo ===============================================
echo.

start "Backend - php artisan serve" cmd /k "cd /d "%~dp0billing_software_backend" && php artisan serve"
start "Frontend - npm run dev" cmd /k "cd /d "%~dp0billing_software_frontend" && npm run dev"
start "WhatsApp Service - npm start" cmd /k "cd /d "%~dp0whatsapp-service" && npm start"

echo.
echo All 3 services launched in separate windows.
echo - Backend      : http://127.0.0.1:8000
echo - Frontend     : http://localhost:5173
echo - WhatsApp Svc : http://localhost:3001
echo.
echo Close each window to stop that service individually.
pause
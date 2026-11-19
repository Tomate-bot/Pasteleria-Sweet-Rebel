@echo off
rem Inicia backend y frontend sin abrir VS Code. Primero copia config-local.bat.ejemplo a config-local.bat y llénalo.
call config-local.bat
start "Backend" cmd /k "gradlew.bat bootRun"
start "Frontend" cmd /k "cd frontend && npm install && npm run dev"

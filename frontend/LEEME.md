# Frontend de la pastelería (React + Vite + PWA)

## Qué se agrega al proyecto
Solo esta carpeta `frontend/` junto a `src/`, `build.gradle`, etc.
**No se toca nada del backend** (`src/`, `build.gradle`, `application.properties`, `infra/`, `postman/`, `docs/`).

## Ejecutar en local
Requisitos: Java 17+, PostgreSQL con la base `pasteleria` restaurada, Node.js 20+.

1. Backend (carpeta raíz del proyecto, como siempre):
   - Windows: `gradlew.bat bootRun`  ·  Linux/macOS: `bash gradlew bootRun`
   - Debe quedar en http://localhost:8082
2. Frontend (otra terminal):
   ```
   cd frontend
   npm install
   npm run dev
   ```
   Abre http://localhost:5173 (también desde tu celular en la misma red: http://IP-de-tu-PC:5173).
3. Usuarios de tu base: `admin` / `admin123` (administración) y `pollito123` / `consulta123` (solo consulta).

Vite reenvía `/api` a `localhost:8082`, por eso no se necesita CORS. Si el backend usa otro puerto/equipo:
`BACKEND_URL=http://otro-host:8082 npm run dev` (en PowerShell: `$env:BACKEND_URL="http://..."; npm run dev`).

## Probar como app instalable (PWA)
```
npm run build
npm run preview      # http://localhost:4173  (también reenvía /api)
```
En Chrome/Edge aparece el icono "Instalar" en la barra de direcciones. La instalación en Android/iOS exige HTTPS (ver guía de publicación).

## Publicar
Ver la guía entregada en el chat. Archivos listos: `netlify.toml` (Netlify) y `functions/` (Cloudflare Pages).
Para ver una URL pública distinta de la de desarrollo no se cambia nada del código: la app siempre llama a `/api/...`.

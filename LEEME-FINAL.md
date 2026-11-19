# Sweet Rebel – guía final (v7)

## 1. Base de datos (una vez, en pgAdmin, base `pasteleria`)
Tu respaldo `pasteleriav2.sql` ya trae las migraciones 01 y 02. Ejecuta en orden las que falten:
`sql/migracion_03_metodo_pago_encuesta.sql`, `04_repostero_usuarios`, `05_perfil_ampliado` y **`06_recuperacion_sin_correo`** (esta última activa las cuentas que quedaron pendientes de verificar por correo).
`sql/actualizacion_completa.sql` junta 01–06 si empiezas desde cero. Guarda una copia de tu respaldo.

## 2. Ejecutar
- **Windows sin VS Code:** doble clic en `iniciar-todo.bat` → http://localhost:5173
- **A mano:** `gradlew.bat bootRun` y, en `frontend`, `npm install && npm run dev`. Pruebas: `gradlew.bat test`.
- **Docker (no probado aquí):** `.env` desde `.env.ejemplo` y `docker compose up --build` → http://localhost:8080

## 3. Cuentas y roles
- **Registro público = siempre cliente**, entra de inmediato (ya no hay código por correo). Al terminar se muestra **una sola vez** un *código de recuperación*: guárdalo.
- **Recuperar usuario o contraseña (sin correo):** "¿Olvidaste tu usuario o contraseña?" → correo + código de recuperación + contraseña nueva. Te muestra tu usuario y te da un código nuevo. 5 intentos fallidos bloquean 15 minutos.
- Cuentas anteriores (admin, etc.): entra → **Mi cuenta → Código de recuperación** para generar el tuyo.
- **Repostero:** NO se registra solo. El administrador lo crea en **Usuarios → Crear cuenta de repostero** (elige a qué repostero corresponde) y le entrega usuario y contraseña. El repostero entra por el mismo login; el sistema lo reconoce por su rol y le muestra su tablero (Por hacer / En proceso / Terminado).
- **Administrador:** panel con resumen, Usuarios, Pedidos, Compras, Privacidad (ARCO) y **Opiniones** (resultados de la encuesta; el admin no la responde).

## 4. Imágenes de productos
Cada producto muestra una ilustración según su nombre. Para usar **fotos reales**, copia `frontend/public/productos/<id del producto>.jpg` (por ejemplo `12.jpg`); la app las usa solas y, si no existe, vuelve a la ilustración.

## 5. Instalar la app
- **Windows (Chrome/Edge):** el botón "Instalar app" abre la instalación directa (necesita https o localhost).
- **iPhone:** solo es posible con Safari → Compartir → "Añadir a pantalla de inicio".
- **Android (APK):** se genera en tu computadora (necesita Android Studio, que trae el SDK):
  1. Instala Android Studio una vez y define la variable de entorno `ANDROID_HOME` (normalmente `C:\Users\TU_USUARIO\AppData\Local\Android\Sdk`). Java 17 ya lo tienes.
  2. Publica el sitio por https (Netlify, o `tailscale funnel`).
  3. En la raíz del proyecto: `generar-apk.bat https://TU-SITIO-PUBLICO`
  4. Se crea `frontend/public/sweet-rebel.apk`. Vuelve a publicar el sitio: en Android el botón pasará a **"Descargar app"** y bajará el APK directo (el usuario debe permitir "instalar apps desconocidas").
  El APK es un contenedor que abre tu sitio publicado, así que se actualiza solo y no requiere CORS. Es APK de depuración (no apto para Google Play).

## 6. Pantallas
Computadora (barra lateral para administración y repostero), tableta, celular vertical (menú inferior) y horizontal. Vista mínima para ≤ 280 px (no probada en relojes reales; Apple Watch no trae navegador).

## 7. Publicar
Frontend gratis en Netlify o Cloudflare Pages (`frontend/netlify.toml`, `frontend/functions/`) y backend con `tailscale funnel --bg 8082`. Un `.com` no es gratuito; la alternativa es el subdominio de la plataforma.

## 8. Pagos
PayPal está integrado (`PayPalService`, `PAYPAL_MODE=sandbox|live`). Stripe, Mercado Pago y OXXO no cobran: su conexión real iría en `ComprasController.crear/capturar` (bloque `"SIM-"`) y en el componente `Comprar` de `frontend/src/App.jsx`. El pie de página indica que es un proyecto escolar sin cobros reales.

## 9. Correo
Ya no se usa para registrarse ni para recuperar la cuenta. El código de `MailService` queda disponible pero sin uso.

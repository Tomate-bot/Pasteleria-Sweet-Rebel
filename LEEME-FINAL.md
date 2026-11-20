# Sweet Rebel – guía final (v7)

## 1. Base de datos (una vez, en pgAdmin, base `pasteleria`)
Si ya aplicaste las migraciones 01–06, ejecuta `sql/migracion_07_compras_reintento.sql` y luego `sql/migracion_08_stripe_checkout.sql`. Si ya aplicaste la 07, ejecuta solo la 08. Ambas son aditivas y no borran compras.

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
PayPal usa `PAYPAL_MODE=sandbox|live` y requiere `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET`. Mercado Pago Checkout Pro requiere `MERCADOPAGO_ACCESS_TOKEN`. Stripe Checkout usa `STRIPE_SECRET_KEY` para tarjeta; habilita tarjeta y OXXO en los métodos de pago del Dashboard de Stripe. La app usa el filtro dinámico de métodos permitido por la API actual de Checkout. OXXO requiere además `STRIPE_WEBHOOK_SECRET` y configurar en Stripe el endpoint público `https://TU_API/api/stripe/webhook` con los eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded` y `checkout.session.async_payment_failed`. OXXO no se ofrecerá si falta el webhook, porque el pago se confirma de forma asíncrona.

Prueba primero con credenciales sandbox y cuentas de prueba de cada proveedor. Las claves van solo en el entorno del backend (`config-local.bat` o `.env`), nunca en el frontend ni en GitHub. La app muestra cada pasarela solo cuando su configuración requerida está presente; no simula cobros.

Administración puede consultar el estado desde **Pasarelas** en el panel, pero no puede guardar secretos desde el navegador. En local, copia `config-local.bat.ejemplo` como `config-local.bat`, completa las variables y reinicia con `iniciar-todo.bat`. En producción, agrega las variables en el servicio donde se ejecuta Spring Boot y reinícialo o vuelve a desplegarlo; si Netlify solo sirve el frontend, no las agregues allí. Para OXXO registra en Stripe el webhook `https://TU_API/api/stripe/webhook` con los eventos indicados arriba.

Las compras interrumpidas sin conexión quedan como borradores locales `INCOMPLETA`; al reintentar, el usuario es enviado a la pasarela activa. Solo el backend puede pasar una compra a `PAGADA` después de confirmar el pago con la pasarela. Aplica las migraciones 07 y 08 antes de arrancar esta versión.

El formulario de encuesta se abre en blanco al iniciar una sesión nueva; la última respuesta continúa guardada en la base para que administración pueda consultar resultados.

## 9. Correo
Ya no se usa para registrarse ni para recuperar la cuenta. El código de `MailService` queda disponible pero sin uso.

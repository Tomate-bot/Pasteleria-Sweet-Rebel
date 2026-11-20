# Sweet Rebel – guía de ejecución y pruebas

Consulta [LEEME-FINAL.md](LEEME-FINAL.md) para el procedimiento completo de ejecución, cuentas, publicación e instalación.

## Base de datos

En una instalación existente, después de las migraciones 01–08 aplica una vez `sql/migracion_09_recuperacion_por_correo.sql` antes de arrancar esta versión. Es aditiva y no elimina datos.

## Ejecución y pruebas

- Windows: doble clic en `iniciar-todo.bat`.
- Pruebas backend: `.\gradlew.bat test`.
- Compilación frontend: desde `frontend`, ejecuta `npm run build`.

Necesitas Java 17+, Node.js y PostgreSQL. Revisa `config-local.bat.ejemplo` y `.env.ejemplo`; conserva las credenciales reales solo en los archivos locales ignorados por Git.

## Compras y pagos

- Si el dispositivo pierde conexión antes de enviar la compra, se guarda localmente como `INCOMPLETA`; no se cobra de forma automática al volver internet.
- Al reintentar, el servidor conserva la compra como `PENDIENTE` hasta confirmar el pago. Los detalles se muestran en un diálogo dentro de la aplicación, sin abrir otra pestaña.
- PayPal requiere `PAYPAL_MODE=sandbox|live`, `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET`. Mercado Pago Checkout Pro requiere `MERCADOPAGO_ACCESS_TOKEN`.
- Stripe Checkout admite tarjeta con `STRIPE_SECRET_KEY`; habilita los métodos de pago (tarjeta y, si aplica, OXXO) en la configuración de Stripe. La aplicación filtra los métodos permitidos usando la API actual de Checkout. Para ofrecer OXXO también configura `STRIPE_WEBHOOK_SECRET` y registra en Stripe el endpoint público `https://TU_API/api/stripe/webhook` para los eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded` y `checkout.session.async_payment_failed`. OXXO permanece deshabilitado sin el webhook porque sus pagos se confirman de forma asíncrona.
- Usa credenciales sandbox y compradores de prueba para validar cada pasarela. No publiques claves en el frontend ni en GitHub; guárdalas únicamente en la configuración privada del backend.
- Administración puede consultar el estado desde **Pasarelas**, pero no introducir secretos en la página. En local, copia `config-local.bat.ejemplo` como `config-local.bat`, configura las variables y reinicia el backend. En producción, configúralas en el servicio que ejecuta Spring Boot (no en Netlify si solo aloja el frontend) y reinícialo o vuelve a desplegarlo.

## Recuperación de contraseña por correo

Configura en el entorno privado del backend `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=587`, `MAIL_USER`, `MAIL_PASSWORD` (contraseña de aplicación de Google) y `MAIL_FROM`. La recuperación manda un código temporal de 6 dígitos al correo de la cuenta; vence en 10 minutos, solo puede utilizarse una vez y está protegido contra intentos repetidos. Aplica `sql/migracion_09_recuperacion_por_correo.sql` antes de iniciar esta versión.

Las credenciales de las pasarelas deben permanecer en el backend, nunca en el frontend ni en GitHub. Las integraciones sandbox no se consideran probadas hasta completar un flujo con las credenciales de prueba del propietario.

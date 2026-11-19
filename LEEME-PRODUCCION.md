# Pastelería – guía de ejecución y pruebas (v3)

## 1. Base de datos
Tu respaldo `pasteleriav2.sql` ya incluye las migraciones 01 y 02. Solo falta ejecutar en pgAdmin (Query Tool, base `pasteleria`):
`sql/migracion_03_metodo_pago_encuesta.sql`  (método de pago + encuesta). Es aditivo y no borra datos.
(`sql/actualizacion_completa.sql` junta las tres migraciones por si empiezas desde una base sin ellas.)

## 2. Correo real (Gmail con contraseña de aplicación)
1. Copia `config-local.bat.ejemplo` como `config-local.bat` y escribe tus datos: `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=587`, `MAIL_USER`, `MAIL_PASSWORD` (16 letras, sin espacios), `MAIL_FROM` (el mismo Gmail).
2. **Ya no existe `MAIL_ENABLED` ni el modo que escribía el código en la terminal.** Si faltan MAIL_HOST/USER/PASSWORD, el registro responde "No pudimos enviar el correo" y en el log solo aparece qué variable falta; el código nunca se imprime.
3. `config-local.bat` está en `.gitignore`: tus claves no se suben a GitHub.

## 3. Ejecutar sin abrir VS Code
Doble clic en `iniciar-todo.bat`: abre dos ventanas (backend en :8082 y frontend en http://localhost:5173).
Requisitos: Java 17+, Node 20+, PostgreSQL encendido.  Pruebas: `gradlew.bat test`.

## 4. Probar cada rol
- **Administrador** (`admin` / tu contraseña actual): ve CRUD completo, Clientes, Pedidos, Compras de todos (con reembolso), Privacidad (ARCO) y los resultados de la Encuesta.
- **Cliente** (regístrate en "Crear cuenta nueva", llega un código a tu correo): ve Productos, Tipos de postre, Mis compras, Encuesta y Mi cuenta. No ve ARCO, CRUD, Reposteros ni administración.
- **Solo consulta** (`pollito123`): ve el catálogo y la encuesta, sin botones de cambio.
- **Repostero:** NO está implementado todavía (ver sección 7).

## 5. Compra con los 4 métodos (simulados)
Productos → **Comprar** → elige PayPal, Tarjeta (Stripe), Mercado Pago u OXXO → pantalla de pago simulada → pagar. Marca "Simular que el pago es rechazado" para ver el estado *Fallida*. No se cobra nada ni se envían datos de tarjeta.
La conexión real iría en `ComprasController.crear/capturar` (bloque `"SIM-"`) y en el componente `Comprar` de `frontend/src/App.jsx`. PayPal ya tiene integración real lista (`PayPalService`, `PAYPAL_MODE=sandbox|live`). Stripe, Mercado Pago y OXXO solo se aceptan mientras `PAYPAL_MODE=simulado`.

## 6. Encuesta de satisfacción
Menú **Encuesta** (todos los roles): 2 preguntas de 1 a 5 estrellas + comentario opcional; una respuesta por usuario, editable. El administrador ve promedios y comentarios en la misma pantalla.

## 7. Pendiente en esta entrega
Rol repostero (y su logística de pedidos), gestión de usuarios y tokens por el administrador, registro con apellidos/teléfono/dirección/foto, rediseño completo de cada panel y vista de reloj. Docker no se incluye.

## 8. Publicar y dominio
- Frontend gratis: Netlify o Cloudflare Pages (ver `frontend/netlify.toml` y `frontend/functions/`) con subdominio `.netlify.app` / `.pages.dev`.
- Un dominio `.com` **no es gratuito** (se paga anualmente); la alternativa gratuita real es el subdominio de la plataforma.
- El backend sigue en tu PC: se expone con Tailscale Funnel (`tailscale funnel --bg 8082`). Render/Railway para el backend Java no los verifiqué, así que no los recomiendo todavía.
- App instalable: botón "Instalar app" (PWA). **No se genera APK** (requiere herramientas de Android que no tengo aquí).

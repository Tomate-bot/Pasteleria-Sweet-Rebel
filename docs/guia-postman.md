# Guía rápida — POSTMAN + terminal (actualizada a JWT)

> Fuente completa: `Manual_Pasteleria_Sprint.docx` en esta carpeta.

## Requisitos

1. Crear BD PostgreSQL `pasteleria` y ejecutar `sql/esquema.sql`.
2. Ejecutar `sql/semilla_5000.sql` (ATENCIÓN: restablece las cinco tablas de negocio; solo demo).
3. Configurar `DB_PASSWORD` y `JWT_SECRET` y arrancar `gradlew.bat bootRun` en Windows o `bash gradlew bootRun` en Linux.
4. Importar `postman/Pasteleria_Sprint.postman_collection.json` y `postman/Pasteleria_Sprint.postman_environment.json`; elegir el entorno.
5. Ejecutar **Login ADMIN**: el token se guarda automáticamente como `accessToken`.

## Autenticación

`POST http://localhost:8082/api/auth/login` con JSON:

```json
{"username":"admin","password":"admin123"}
```

Usar encabezado: `Authorization: Bearer <access_token>` (nunca Basic Auth). Cuentas académicas: `admin/admin123`, `consulta/consulta123`, `cliente_demo/cliente123`.

## Cinco controladores CRUD

Cada recurso soporta `GET /api/<recurso>`, `GET /api/<recurso>/{id}`, `POST /api/<recurso>`, `PUT /api/<recurso>/{id}` y `DELETE /api/<recurso>/{id}`.

| Recurso | Cuerpo para POST y PUT |
|---|---|
| `categorias` | `{"nombre":"Tartas"}` |
| `reposteros` | `{"nombre":"Ana","ciudad":"Puebla"}` |
| `productos` | `{"nombre":"Pastel","descripcion":"Demo","precio":250,"reposteroId":2,"categoriaId":2}` |
| `clientes` | `{"nombre":"Cliente ejemplo","email":"ejemplo@example.test","telefono":"5551234567"}` |
| `pedidos` | `{"clienteId":2,"productoId":2,"cantidad":2,"estado":"PENDIENTE"}` |

El rol `admin` puede usar CRUD. `consulta` y `cliente_demo` solo consultan catálogo; `cliente_demo` también puede usar sus propias rutas ARCO. Códigos 200/201/204 son éxitos; 400 datos incorrectos; 401 sin token; 403 sin permiso; 404 inexistente; 409 registro vinculado o duplicado.

## Derechos ARCO (la cuenta cliente_demo)

- **Acceso:** `GET /api/arco/mis-datos`
- **Rectificación:** `PUT /api/arco/rectificacion` con `{"nombre":"Cliente corregido","email":"cliente1@example.test","telefono":"5551112222"}`
- **Oposición:** `PATCH /api/arco/oposicion`
- **Cancelación:** `DELETE /api/arco/cancelacion` **dejar para el final**

Solo afecta al cliente asociado a la cuenta autenticada. Las solicitudes legales requieren verificación formal de identidad, decisiones fundadas, plazos y seguimiento que exceden este demo. La cancelación realiza seudonimización parcial y conserva relaciones de pedidos.

## Plan B PowerShell

```powershell
$base = "http://localhost:8082"
$body = @{ username="admin"; password="admin123" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body $body
$headers = @{ Authorization = "Bearer $($login.access_token)" }
Invoke-RestMethod -Uri "$base/api/categorias" -Headers $headers
```

## Plan B Bash

```bash
BASE=http://localhost:8082
TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
curl -i "$BASE/api/productos" -H "Authorization: Bearer $TOKEN"
```

## Dominio local

Crea DNS/hosts `192.168.1.50 pasteleria.test` reemplazando la IP por la de tu servidor. Usa `infra/Caddyfile` para que HTTP puerto 80 proxee hacia `127.0.0.1:8082`, con lo que Postman puede usar `http://pasteleria.test`. En redes reales habilitar HTTPS; HTTP solo para laboratorio aislado.

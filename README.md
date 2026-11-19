# Pastelería Sprint — revisión de entrega escolar

## Contenido
- **Cinco controladores CRUD:** `CategoriaController`, `ProductoController`, `ReposteroController` (POST incorporado), `ClienteController` y `PedidoController`.
- **Autenticación JWT HS256:** `POST /api/auth/login`, token Bearer en las peticiones, roles `ADMIN`, `USER` y `CLIENTE`.
- **Derechos ARCO:** `GET /api/arco/mis-datos`, `PUT /api/arco/rectificacion`, `PATCH /api/arco/oposicion`, `DELETE /api/arco/cancelacion`.
- **PostgreSQL:** `sql/00_crear_base.sql`, `sql/esquema.sql`, `sql/semilla_5000.sql` (25,000 filas de 5 entidades; borra los datos de negocio al ejecutarse).
- **Manual Word:** `docs/Manual_Pasteleria_Sprint.docx`, aviso de privacidad, Postman, terminal y dominio local.
- **Colección Postman:** `postman/Pasteleria_Sprint.postman_collection.json` y entorno de ejemplo.
- **Red local:** `infra/Caddyfile` y `infra/hosts-ejemplo.txt`.

## Inicio rápido
1. Tener JDK 17+, PostgreSQL, Gradle Wrapper con acceso a dependencias y terminal (PowerShell o Bash).
2. `psql -U postgres -d postgres -f sql/00_crear_base.sql` (solo si no existe `pasteleria`).
3. `psql -U postgres -d pasteleria -f sql/esquema.sql`.
4. `psql -U postgres -d pasteleria -f sql/semilla_5000.sql` (**destructivo para tablas de negocio**).
5. Configurar `DB_PASSWORD` y `JWT_SECRET` (mínimo 32 caracteres) en variables de entorno del sistema.
6. Windows: `gradlew.bat bootRun` · Linux/macOS: `bash gradlew bootRun`.
7. Obtener token con `POST http://localhost:8082/api/auth/login`:
   `{"username":"admin","password":"admin123"}`.
8. Enviar `Authorization: Bearer <access_token>` para consultar/editar el catálogo.

Credenciales SOLO DEMO: `admin/admin123`, `consulta/consulta123`, `cliente_demo/cliente123`.
La cuenta `cliente_demo` es titular de `cliente.id=1` después de la semilla.

## Consideraciones
- Los derechos ARCO de `/api/arco/**` corresponden exclusivamente al titular del JWT; no se acepta indicar un ID ajeno. El método de cancelación conserva un identificador técnico y los pedidos; es una **demostración técnica**, no una gestión completa del procedimiento legal.
- El endpoint histórico `PATCH /api/reposteros/{id}/oposicion` se mantiene para compatibilidad, pero es una operación administrativa del catálogo, NO la verificación de una solicitud legal ARCO.
- Para consultar la API con nombre de dominio sin escribir `:8082`, configure DNS/hosts **y** un proxy inverso. `infra/Caddyfile` muestra un ejemplo HTTP únicamente para un laboratorio aislado. En redes reales usar HTTPS y credenciales propias.
- Antes de producción: eliminar cuentas de demostración, completar datos del aviso de privacidad, habilitar HTTPS, políticas de retención, trazabilidad/auditoría, verificación documental y un procedimiento humano ARCO.
- **Pruebas:** el archivo fue revisado estáticamente; no se ejecutó Gradle/Spring ni PostgreSQL en este entorno porque no se pudo descargar la distribución de Gradle. Ejecute la lista de pruebas del manual en su equipo.

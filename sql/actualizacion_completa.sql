-- Ejecutar UNA vez en la base "pasteleria" (pgAdmin > Query Tool). Es aditivo: no borra datos.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(150);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users (lower(email));

CREATE TABLE IF NOT EXISTS codigo_verificacion (
  id          BIGSERIAL PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
  proposito   VARCHAR(20)  NOT NULL CHECK (proposito IN ('REGISTRO','RECUPERACION')),
  codigo_hash VARCHAR(100) NOT NULL,        -- el código nunca se guarda en claro
  expira      TIMESTAMP    NOT NULL,
  intentos    INT          NOT NULL DEFAULT 0,
  usado       BOOLEAN      NOT NULL DEFAULT FALSE,
  creado      TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_codigo_usuario ON codigo_verificacion (username, proposito, usado);
-- Ejecutar UNA vez en la base "pasteleria" (después de migracion_01). Es aditivo: no borra datos.
CREATE TABLE IF NOT EXISTS transaccion (
  id                BIGSERIAL PRIMARY KEY,
  username          VARCHAR(50)   NOT NULL REFERENCES users(username) ON UPDATE CASCADE,
  producto_id       BIGINT        NOT NULL REFERENCES producto(id),
  cantidad          INT           NOT NULL CHECK (cantidad BETWEEN 1 AND 1000),
  monto             NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  moneda            CHAR(3)       NOT NULL DEFAULT 'MXN',
  estado            VARCHAR(12)   NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','PAGADA','FALLIDA','REEMBOLSADA')),
  paypal_order_id   VARCHAR(64) UNIQUE,
  paypal_capture_id VARCHAR(64),
  pedido_id         BIGINT REFERENCES pedido(id) ON DELETE SET NULL,
  creada            TIMESTAMP NOT NULL DEFAULT now(),
  actualizada       TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_transaccion_usuario ON transaccion (username, id DESC);
CREATE TABLE IF NOT EXISTS evento_webhook (id VARCHAR(80) PRIMARY KEY, recibido TIMESTAMP NOT NULL DEFAULT now()); -- idempotencia
-- Ejecutar UNA vez (después de las migraciones 01 y 02). Aditivo: no borra datos.
ALTER TABLE transaccion ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(12) NOT NULL DEFAULT 'PAYPAL';
ALTER TABLE transaccion DROP CONSTRAINT IF EXISTS transaccion_metodo_check;
ALTER TABLE transaccion ADD CONSTRAINT transaccion_metodo_check CHECK (metodo_pago IN ('PAYPAL','STRIPE','MERCADOPAGO','OXXO'));
CREATE TABLE IF NOT EXISTS encuesta_satisfaccion (
  username   VARCHAR(50) PRIMARY KEY REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
  general    SMALLINT NOT NULL CHECK (general BETWEEN 1 AND 5),
  facilidad  SMALLINT NOT NULL CHECK (facilidad BETWEEN 1 AND 5),
  comentario VARCHAR(500) NOT NULL DEFAULT '',
  creada     TIMESTAMP NOT NULL DEFAULT now()
);
-- Ejecutar UNA vez (después de 01, 02 y 03). Aditivo: no borra datos.
-- Vincula una cuenta de usuario con un repostero (para el rol ROLE_REPOSTERO).
ALTER TABLE repostero ADD COLUMN IF NOT EXISTS usuario VARCHAR(50) UNIQUE REFERENCES users(username) ON UPDATE CASCADE ON DELETE SET NULL;
-- Ejecutar UNA vez (después de 01..04). Aditivo: no borra datos.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nombres          VARCHAR(60),
  ADD COLUMN IF NOT EXISTS apellido_paterno VARCHAR(60),
  ADD COLUMN IF NOT EXISTS apellido_materno VARCHAR(60),
  ADD COLUMN IF NOT EXISTS telefono         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS direccion        VARCHAR(250),
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS foto             BYTEA,
  ADD COLUMN IF NOT EXISTS foto_tipo        VARCHAR(20);

-- ARCO (cancelación): cuando un cliente se cancela, también se borran estos datos personales del perfil.
CREATE OR REPLACE FUNCTION limpiar_perfil_cancelado() RETURNS trigger AS $$
BEGIN
  IF NEW.cancelado AND NOT OLD.cancelado AND OLD.usuario IS NOT NULL THEN
    UPDATE users SET nombres = NULL, apellido_paterno = NULL, apellido_materno = NULL, telefono = NULL,
                     direccion = NULL, fecha_nacimiento = NULL, foto = NULL, foto_tipo = NULL
    WHERE username = OLD.usuario;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_limpiar_perfil ON cliente;
CREATE TRIGGER trg_limpiar_perfil AFTER UPDATE OF cancelado ON cliente FOR EACH ROW EXECUTE FUNCTION limpiar_perfil_cancelado();
-- Ejecutar UNA vez (después de 01..05). Aditivo.
-- Recuperación de cuenta SIN correo: cada usuario tiene un "código de recuperación" (se guarda solo su hash).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS recuperacion_hash VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rec_intentos INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rec_bloqueo TIMESTAMP;
-- Registro ya no pide verificar por correo: activa las cuentas que quedaron pendientes de verificar.
UPDATE users SET enabled = TRUE
WHERE NOT enabled AND username IN (SELECT username FROM codigo_verificacion WHERE proposito = 'REGISTRO' AND NOT usado);
-- Ejecutar UNA vez despues de las migraciones 01..06.
-- Conserva referencias de solicitud para que un reintento de red no duplique una compra.
ALTER TABLE transaccion
  ADD COLUMN IF NOT EXISTS client_reference VARCHAR(36),
  ADD COLUMN IF NOT EXISTS checkout_url VARCHAR(1000);
CREATE UNIQUE INDEX IF NOT EXISTS ux_transaccion_client_reference
  ON transaccion (client_reference)
  WHERE client_reference IS NOT NULL;
-- Stripe Checkout puede usar identificadores mayores a 64 caracteres.
ALTER TABLE transaccion
  ALTER COLUMN paypal_order_id TYPE VARCHAR(100);

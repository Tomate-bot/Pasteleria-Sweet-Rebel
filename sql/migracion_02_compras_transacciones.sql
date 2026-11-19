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

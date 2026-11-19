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

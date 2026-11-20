-- Ejecutar UNA vez despues de las migraciones 01..06.
-- Conserva referencias de solicitud para que un reintento de red no duplique una compra.
ALTER TABLE transaccion
  ADD COLUMN IF NOT EXISTS client_reference VARCHAR(36),
  ADD COLUMN IF NOT EXISTS checkout_url VARCHAR(1000);

CREATE UNIQUE INDEX IF NOT EXISTS ux_transaccion_client_reference
  ON transaccion (client_reference)
  WHERE client_reference IS NOT NULL;

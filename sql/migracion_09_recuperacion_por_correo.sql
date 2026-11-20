-- Ejecutar UNA vez despues de las migraciones 01..08. Aditivo; no borra cuentas ni datos.
-- El codigo temporal de recuperacion se almacena como hash y vence.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS rec_codigo_hash VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rec_codigo_expira TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rec_codigo_enviado TIMESTAMP;

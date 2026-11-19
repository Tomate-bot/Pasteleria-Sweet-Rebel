-- Ejecutar UNA vez (después de 01..05). Aditivo.
-- Recuperación de cuenta SIN correo: cada usuario tiene un "código de recuperación" (se guarda solo su hash).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS recuperacion_hash VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rec_intentos INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rec_bloqueo TIMESTAMP;
-- Registro ya no pide verificar por correo: activa las cuentas que quedaron pendientes de verificar.
UPDATE users SET enabled = TRUE
WHERE NOT enabled AND username IN (SELECT username FROM codigo_verificacion WHERE proposito = 'REGISTRO' AND NOT usado);

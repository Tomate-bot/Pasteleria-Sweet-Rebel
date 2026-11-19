-- Ejecutar UNA vez (después de 01, 02 y 03). Aditivo: no borra datos.
-- Vincula una cuenta de usuario con un repostero (para el rol ROLE_REPOSTERO).
ALTER TABLE repostero ADD COLUMN IF NOT EXISTS usuario VARCHAR(50) UNIQUE REFERENCES users(username) ON UPDATE CASCADE ON DELETE SET NULL;

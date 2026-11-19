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

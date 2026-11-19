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

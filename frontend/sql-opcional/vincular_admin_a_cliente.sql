-- OPCIONAL. Ejecútalo TÚ en pgAdmin (base "pasteleria"). No cambia el backend, solo datos.
-- Crea un cliente propio para "admin" y lo vincula, para que admin pueda ejercer ARCO sobre sus datos.
BEGIN;
INSERT INTO cliente (id, nombre, email, telefono, usuario, oposicion, cancelado)
SELECT COALESCE(MAX(id),0)+1, 'Administrador', 'admin@example.test', '5550000000', 'admin', false, false FROM cliente;
SELECT setval(pg_get_serial_sequence('cliente','id'), (SELECT MAX(id) FROM cliente));
COMMIT;

-- ALTERNATIVA: "revivir" a cliente_demo (hoy está cancelado) para probar ARCO con esa cuenta:
-- UPDATE cliente SET cancelado=false, oposicion=false, nombre='Cliente demostración',
--        email='cliente1@example.test', telefono='5551112222' WHERE id=1;

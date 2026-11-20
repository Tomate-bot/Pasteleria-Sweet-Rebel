-- Ejecutar UNA vez despues de la migracion_07.
-- Los identificadores de Checkout de Stripe pueden ser mas largos que los de PayPal.
ALTER TABLE transaccion
  ALTER COLUMN paypal_order_id TYPE VARCHAR(100);

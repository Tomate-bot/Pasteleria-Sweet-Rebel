package com.example.pasteleria.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Reglas puras de compra: el monto SIEMPRE lo calcula el servidor, nunca el navegador. */
public final class ReglasCompra {
    private ReglasCompra() {}
    public static boolean metodoValido(String m) { return java.util.Set.of("PAYPAL", "STRIPE", "MERCADOPAGO", "OXXO").contains(m); }
    public static boolean cantidadValida(int c) { return c >= 1 && c <= 1000; }
    public static BigDecimal monto(BigDecimal precio, int cantidad) {
        return precio.multiply(BigDecimal.valueOf(cantidad)).setScale(2, RoundingMode.HALF_UP);
    }
    /** PENDIENTE→PAGADA|FALLIDA, PAGADA→REEMBOLSADA. FALLIDA y REEMBOLSADA son finales. */
    public static boolean transicionValida(String de, String a) {
        return switch (de) {
            case "PENDIENTE" -> a.equals("PAGADA") || a.equals("FALLIDA");
            case "PAGADA" -> a.equals("REEMBOLSADA");
            default -> false;
        };
    }
}

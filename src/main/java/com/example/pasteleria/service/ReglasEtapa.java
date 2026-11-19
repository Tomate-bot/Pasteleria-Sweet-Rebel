package com.example.pasteleria.service;

/** Logística del pedido: PENDIENTE → PREPARANDO → ENTREGADO. Se puede cancelar antes de entregar. */
public final class ReglasEtapa {
    private ReglasEtapa() {}
    public static boolean valida(String de, String a) {
        return switch (de) {
            case "PENDIENTE" -> a.equals("PREPARANDO") || a.equals("CANCELADO");
            case "PREPARANDO" -> a.equals("ENTREGADO") || a.equals("CANCELADO");
            default -> false;
        };
    }
}

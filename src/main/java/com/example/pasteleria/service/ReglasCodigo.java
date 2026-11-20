package com.example.pasteleria.service;

import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.regex.Pattern;

/** Reglas puras (sin base de datos) de códigos, correos y contraseñas. Fáciles de probar. */
public final class ReglasCodigo {
    public static final int MAX_INTENTOS = 5;
    public static final int VIGENCIA_MINUTOS = 10;
    public static final int ESPERA_REENVIO_SEGUNDOS = 60;
    private static final SecureRandom AZAR = new SecureRandom();
    private static final Pattern EMAIL = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private ReglasCodigo() {}

    private static final String ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // sin O/0/I/1 para no confundir

    /** Código de recuperación de cuenta: 12 caracteres, formato XXXX-XXXX-XXXX (~60 bits). */
    public static String generarRecuperacion() {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < 12; i++) { if (i > 0 && i % 4 == 0) b.append('-'); b.append(ALFABETO.charAt(AZAR.nextInt(ALFABETO.length()))); }
        return b.toString();
    }
    public static String normalizarRecuperacion(String c) { return c == null ? "" : c.replaceAll("[\\s-]", "").toUpperCase(); }

    public static String generar() { return String.format("%06d", AZAR.nextInt(1_000_000)); }
    public static boolean emailValido(String e) { return e != null && e.trim().length() <= 150 && EMAIL.matcher(e.trim()).matches(); }
    public static boolean passwordValida(String p) {
        return p != null && p.length() >= 12 && p.length() <= 100
            && p.getBytes(StandardCharsets.UTF_8).length <= 72;
    }
    public static boolean expirado(Instant expira, Instant ahora) { return !ahora.isBefore(expira); }
    public static boolean sinIntentos(int usados) { return usados >= MAX_INTENTOS; }
}

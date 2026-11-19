package com.example.pasteleria.service;

import java.time.LocalDate;
import java.util.regex.Pattern;

/** Validaciones puras del perfil (nombres, teléfono, fecha y tipo real de imagen). */
public final class ReglasPerfil {
    public static final int MAX_FOTO = 200_000;   // bytes; el navegador ya la reduce a ~30 KB
    private static final Pattern NOMBRE = Pattern.compile("[\\p{L}][\\p{L} .'-]{0,59}");
    private ReglasPerfil() {}

    public static boolean nombreValido(String s) { return s != null && NOMBRE.matcher(s.trim()).matches(); }
    public static boolean direccionValida(String s) { return s == null || s.trim().length() <= 250; }
    public static boolean fechaNacimientoValida(LocalDate f, LocalDate hoy) { return f == null || (!f.isAfter(hoy) && f.isAfter(LocalDate.of(1900, 1, 1))); }

    /** @return 10 dígitos, "" si viene vacío, o null si es inválido. Acepta espacios, guiones, paréntesis y +52. */
    public static String telefono(String s) {
        if (s == null || s.isBlank()) return "";
        String d = s.replaceAll("[\\s()-]", "");
        if (d.startsWith("+52")) d = d.substring(3);
        return d.matches("\\d{10}") ? d : null;
    }

    /** Detecta el tipo REAL por los primeros bytes (no confía en lo que diga el navegador). null = no permitido. */
    public static String tipoImagen(byte[] b) {
        if (b == null || b.length < 12 || b.length > MAX_FOTO) return null;
        if ((b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "image/jpeg";
        if ((b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return "image/png";
        if (b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "image/webp";
        return null;
    }
}

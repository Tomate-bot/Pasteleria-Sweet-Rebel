package com.example.pasteleria.service;

import java.util.regex.Pattern;

public final class ReglasEncuesta {
    private static final Pattern COMENTARIO = Pattern.compile("[\\p{L}\\p{M}\\p{N}\\s.,!?¡¿:;'\"()/-]*");

    private ReglasEncuesta() {}

    public static boolean comentarioValido(String comentario) {
        return comentario != null && comentario.length() <= 500 && COMENTARIO.matcher(comentario).matches();
    }
}

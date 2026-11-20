package com.example.pasteleria.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ReglasEncuestaTest {
    @Test void permiteComentarioDeTextoComunEnEspanol() {
        assertTrue(ReglasEncuesta.comentarioValido("¡Muy rico! Me gustó el pastel número 2."));
        assertTrue(ReglasEncuesta.comentarioValido("x".repeat(500)));
    }

    @Test void rechazaEtiquetasYControlaLaLongitud() {
        assertFalse(ReglasEncuesta.comentarioValido("<script>alert(1)</script>"));
        assertFalse(ReglasEncuesta.comentarioValido("' OR 1=1 --"));
        assertFalse(ReglasEncuesta.comentarioValido("x".repeat(501)));
    }
}

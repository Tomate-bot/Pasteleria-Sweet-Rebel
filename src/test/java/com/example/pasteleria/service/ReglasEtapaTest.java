package com.example.pasteleria.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ReglasEtapaTest {
    @Test void flujoNormalDelPedido() {
        assertTrue(ReglasEtapa.valida("PENDIENTE", "PREPARANDO"));
        assertTrue(ReglasEtapa.valida("PREPARANDO", "ENTREGADO"));
        assertTrue(ReglasEtapa.valida("PENDIENTE", "CANCELADO"));
        assertTrue(ReglasEtapa.valida("PREPARANDO", "CANCELADO"));
    }
    @Test void noSePuedeSaltarNiRetroceder() {
        assertFalse(ReglasEtapa.valida("PENDIENTE", "ENTREGADO"));
        assertFalse(ReglasEtapa.valida("ENTREGADO", "PREPARANDO"));
        assertFalse(ReglasEtapa.valida("CANCELADO", "PENDIENTE"));
    }
}

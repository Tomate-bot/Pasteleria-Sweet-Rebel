package com.example.pasteleria.service;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

class ReglasCodigoTest {
    @Test void codigoTieneSeisDigitos() {
        for (int i = 0; i < 500; i++) assertTrue(ReglasCodigo.generar().matches("\\d{6}"));
    }
    @Test void validaCorreos() {
        assertTrue(ReglasCodigo.emailValido("ana@correo.com"));
        assertFalse(ReglasCodigo.emailValido("ana@correo"));
        assertFalse(ReglasCodigo.emailValido(null));
    }
    @Test void exigeContrasenaDeDoceCaracteres() {
        assertFalse(ReglasCodigo.passwordValida("corta123"));
        assertTrue(ReglasCodigo.passwordValida("una-clave-larga-1"));
    }
    @Test void elCodigoVenceExactamenteEnLaFechaDeExpiracion() {
        Instant t = Instant.parse("2026-01-01T10:00:00Z");
        assertFalse(ReglasCodigo.expirado(t, t.minusSeconds(1)));
        assertTrue(ReglasCodigo.expirado(t, t));
    }
    @Test void bloqueaTrasCincoIntentos() {
        assertFalse(ReglasCodigo.sinIntentos(4));
        assertTrue(ReglasCodigo.sinIntentos(5));
    }
    @Test void codigoDeRecuperacion() {
        String c = ReglasCodigo.generarRecuperacion();
        assertTrue(c.matches("[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}"));
        assertEquals(c.replace("-", ""), ReglasCodigo.normalizarRecuperacion(c.toLowerCase()));
        assertEquals("ABCD1234", ReglasCodigo.normalizarRecuperacion(" abcd-1234 "));
    }
}

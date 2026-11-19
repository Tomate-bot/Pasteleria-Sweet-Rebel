package com.example.pasteleria.service;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

class ReglasPerfilTest {
    @Test void nombresConAcentosSiPeroNumerosNo() {
        assertTrue(ReglasPerfil.nombreValido("María José"));
        assertTrue(ReglasPerfil.nombreValido("O'Connor"));
        assertFalse(ReglasPerfil.nombreValido("R2D2"));
        assertFalse(ReglasPerfil.nombreValido(""));
        assertFalse(ReglasPerfil.nombreValido(null));
    }
    @Test void telefonoDeDiezDigitos() {
        assertEquals("5512345678", ReglasPerfil.telefono("55 1234-5678"));
        assertEquals("5512345678", ReglasPerfil.telefono("+52 (55) 12345678"));
        assertEquals("", ReglasPerfil.telefono("  "));
        assertNull(ReglasPerfil.telefono("12345"));
    }
    @Test void fechaDeNacimiento() {
        LocalDate hoy = LocalDate.of(2026, 11, 18);
        assertTrue(ReglasPerfil.fechaNacimientoValida(null, hoy));
        assertTrue(ReglasPerfil.fechaNacimientoValida(LocalDate.of(2000, 5, 1), hoy));
        assertFalse(ReglasPerfil.fechaNacimientoValida(LocalDate.of(2027, 1, 1), hoy));
        assertFalse(ReglasPerfil.fechaNacimientoValida(LocalDate.of(1800, 1, 1), hoy));
    }
    @Test void detectaElTipoRealDeImagen() {
        byte[] jpg = new byte[20]; jpg[0] = (byte) 0xFF; jpg[1] = (byte) 0xD8; jpg[2] = (byte) 0xFF;
        byte[] png = new byte[20]; png[0] = (byte) 0x89; png[1] = 'P'; png[2] = 'N'; png[3] = 'G';
        byte[] exe = new byte[20]; exe[0] = 'M'; exe[1] = 'Z';
        assertEquals("image/jpeg", ReglasPerfil.tipoImagen(jpg));
        assertEquals("image/png", ReglasPerfil.tipoImagen(png));
        assertNull(ReglasPerfil.tipoImagen(exe));
        assertNull(ReglasPerfil.tipoImagen(new byte[ReglasPerfil.MAX_FOTO + 1]));
    }
}

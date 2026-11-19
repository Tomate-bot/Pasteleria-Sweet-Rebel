package com.example.pasteleria.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MailServiceTest {
    @Test void sinCredencialesNoEstaConfigurado() {
        assertFalse(MailService.configurado(null, null));
        assertFalse(MailService.configurado("", "x"));
        assertFalse(MailService.configurado("a@b.com", "  "));
        assertTrue(MailService.configurado("a@b.com", "clave"));
    }
}

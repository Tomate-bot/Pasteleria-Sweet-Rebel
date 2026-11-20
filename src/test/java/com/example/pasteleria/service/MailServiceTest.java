package com.example.pasteleria.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.junit.jupiter.api.Assertions.*;
import org.mockito.ArgumentCaptor;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MailServiceTest {
    @Test void sinCredencialesNoEstaConfigurado() {
        assertFalse(MailService.configurado(null, null));
        assertFalse(MailService.configurado("", "x"));
        assertFalse(MailService.configurado("a@b.com", "  "));
        assertTrue(MailService.configurado("a@b.com", "clave"));
    }

    @SuppressWarnings("unchecked")
    @Test void enviarEntregaElMensajeAlServidorSmtp() {
        ObjectProvider<JavaMailSender> proveedor = mock(ObjectProvider.class);
        JavaMailSender smtp = mock(JavaMailSender.class);
        when(proveedor.getIfAvailable()).thenReturn(smtp);
        MailService correo = new MailService(proveedor, "cuenta@gmail.com", "app-password", "cuenta@gmail.com");

        assertTrue(correo.enviar("ana@example.com", "Recuperación", "Código temporal: 123456"));

        ArgumentCaptor<SimpleMailMessage> mensaje = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(smtp).send(mensaje.capture());
        assertEquals("ana@example.com", mensaje.getValue().getTo()[0]);
        assertEquals("Recuperación", mensaje.getValue().getSubject());
        assertTrue(mensaje.getValue().getText().contains("123456"));
    }
}

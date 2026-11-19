package com.example.pasteleria.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/** Envío real por SMTP (Gmail con contraseña de aplicación). El contenido del mensaje NUNCA se escribe en el log. */
@Service
public class MailService {
    private static final Logger LOG = LoggerFactory.getLogger(MailService.class);
    private final ObjectProvider<JavaMailSender> sender;
    private final String usuario, clave, remitente;

    public MailService(ObjectProvider<JavaMailSender> sender, @Value("${spring.mail.username:}") String usuario,
                       @Value("${spring.mail.password:}") String clave, @Value("${app.mail.from:}") String remitente) {
        this.sender = sender; this.usuario = usuario; this.clave = clave; this.remitente = remitente;
    }

    public static boolean configurado(String usuario, String clave) {
        return usuario != null && !usuario.isBlank() && clave != null && !clave.isBlank();
    }

    /** @return true solo si el servidor SMTP aceptó el correo. */
    public boolean enviar(String para, String asunto, String texto) {
        JavaMailSender s = sender.getIfAvailable();
        if (s == null || !configurado(usuario, clave)) {
            LOG.error("Correo NO enviado: faltan MAIL_HOST, MAIL_USER o MAIL_PASSWORD.");
            return false;
        }
        try {
            SimpleMailMessage m = new SimpleMailMessage();
            m.setFrom(remitente == null || remitente.isBlank() ? usuario : remitente);
            m.setTo(para); m.setSubject(asunto); m.setText(texto);
            s.send(m);
            return true;
        } catch (MailException ex) {
            LOG.error("No se pudo enviar el correo a {}: {}", para, ex.getMessage());
            return false;
        }
    }
}

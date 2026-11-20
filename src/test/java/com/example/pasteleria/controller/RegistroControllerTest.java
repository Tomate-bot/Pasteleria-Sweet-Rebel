package com.example.pasteleria.controller;

import com.example.pasteleria.repository.ClienteRepository;
import com.example.pasteleria.service.MailService;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RegistroControllerTest {
    private static final String EMAIL = "ana@example.com";

    @Test
    void enviaCodigoTemporalAlCorreoRegistradoYPermiteCambiarLaContrasena() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        ClienteRepository clientes = mock(ClienteRepository.class);
        MailService correo = mock(MailService.class);
        RegistroController controller = new RegistroController(jdbc, encoder, clientes, correo);

        Map<String, Object> cuenta = new HashMap<>();
        cuenta.put("username", "ana");
        cuenta.put("rec_codigo_enviado", null);
        cuenta.put("rec_bloqueo", null);
        when(jdbc.queryForList(contains("rec_codigo_enviado"), eq(EMAIL))).thenReturn(List.of(cuenta));
        when(encoder.encode(anyString())).thenReturn("codigo-hasheado");
        when(correo.enviar(eq(EMAIL), anyString(), anyString())).thenReturn(true);

        ResponseEntity<?> inicio = controller.solicitarRecuperacion(new RegistroController.SolicitarRecuperacion(EMAIL));
        assertEquals(200, inicio.getStatusCode().value());
        verify(correo).enviar(eq(EMAIL), anyString(), anyString());

        org.mockito.ArgumentCaptor<String> mensaje = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(correo).enviar(eq(EMAIL), anyString(), mensaje.capture());
        Matcher codigoEnCorreo = Pattern.compile("es: (\\d{6})").matcher(mensaje.getValue());
        assertTrue(codigoEnCorreo.find());
        String codigo = codigoEnCorreo.group(1);

        Map<String, Object> datosRestablecer = new HashMap<>();
        datosRestablecer.put("username", "ana");
        datosRestablecer.put("recuperacion_hash", null);
        datosRestablecer.put("rec_codigo_hash", "codigo-hasheado");
        datosRestablecer.put("rec_codigo_expira", Timestamp.from(Instant.now().plusSeconds(600)));
        datosRestablecer.put("rec_intentos", 0);
        datosRestablecer.put("rec_bloqueo", null);
        when(jdbc.queryForList(contains("rec_codigo_hash"), eq(EMAIL))).thenReturn(List.of(datosRestablecer));
        when(encoder.matches(codigo, "codigo-hasheado")).thenReturn(true);
        when(encoder.encode("NuevaContrasenaSegura123")).thenReturn("contrasena-hasheada");

        ResponseEntity<?> resultado = controller.restablecer(
            new RegistroController.Restablecer(EMAIL, codigo, "NuevaContrasenaSegura123"));

        assertEquals(200, resultado.getStatusCode().value());
        assertTrue(resultado.getBody().toString().contains("Contraseña actualizada"));
        assertFalse(resultado.getBody().toString().contains(codigo));
        verify(jdbc).update(contains("rec_codigo_hash = NULL"), any(Object[].class));
    }

    @Test
    void noRevelaSiElCorreoNoTieneUnaCuenta() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        ClienteRepository clientes = mock(ClienteRepository.class);
        MailService correo = mock(MailService.class);
        RegistroController controller = new RegistroController(jdbc, encoder, clientes, correo);
        when(jdbc.queryForList(contains("rec_codigo_enviado"), eq(EMAIL))).thenReturn(List.of());

        ResponseEntity<?> respuesta = controller.solicitarRecuperacion(
            new RegistroController.SolicitarRecuperacion(EMAIL));

        assertEquals(200, respuesta.getStatusCode().value());
        verify(correo, never()).enviar(anyString(), anyString(), anyString());
    }

    @Test
    void informaErrorSiElServidorNoAceptaElCorreo() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        ClienteRepository clientes = mock(ClienteRepository.class);
        MailService correo = mock(MailService.class);
        RegistroController controller = new RegistroController(jdbc, encoder, clientes, correo);
        Map<String, Object> cuenta = new HashMap<>();
        cuenta.put("username", "ana");
        cuenta.put("rec_codigo_enviado", null);
        cuenta.put("rec_bloqueo", null);
        when(jdbc.queryForList(contains("rec_codigo_enviado"), eq(EMAIL))).thenReturn(List.of(cuenta));
        when(encoder.encode(anyString())).thenReturn("codigo-hasheado");
        when(correo.enviar(eq(EMAIL), anyString(), anyString())).thenReturn(false);

        ResponseEntity<?> respuesta = controller.solicitarRecuperacion(
            new RegistroController.SolicitarRecuperacion(EMAIL));

        assertEquals(503, respuesta.getStatusCode().value());
        assertFalse(respuesta.getBody().toString().contains("código para restablecer la contraseña."));
    }
}

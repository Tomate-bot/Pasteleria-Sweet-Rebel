package com.example.pasteleria.controller;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PerfilControllerTest {
    @Test
    void reposteroNoPuedeGuardarUnaFechaDeNacimientoFutura() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(jdbc.queryForObject("SELECT password FROM users WHERE username = ?", String.class, "repostero"))
            .thenReturn("hash");
        when(encoder.matches("secreto", "hash")).thenReturn(true);
        PerfilController controller = new PerfilController(jdbc, encoder);
        var auth = new UsernamePasswordAuthenticationToken("repostero", null,
            List.of(new SimpleGrantedAuthority("ROLE_REPOSTERO")));
        var datos = new PerfilController.Datos(
            "Alma", "Pérez", "", "", "", LocalDate.now().plusDays(7).toString(), "secreto"
        );

        var respuesta = controller.guardar(auth, datos);

        assertEquals(400, respuesta.getStatusCode().value());
        verify(jdbc, never()).update(eq("UPDATE users SET nombre = ?, nombres = ?, apellido_paterno = ?, apellido_materno = ?, telefono = ?, direccion = ?, fecha_nacimiento = ? WHERE username = ?"), any(Object[].class));
    }
}

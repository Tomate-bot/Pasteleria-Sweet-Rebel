package com.example.pasteleria.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/** Códigos de un solo uso: se guardan con hash, vencen y limitan los intentos. */
@Service
public class CodigoService {
    public record Resultado(boolean ok, int status, String mensaje) {}
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;

    public CodigoService(JdbcTemplate jdbc, PasswordEncoder encoder) { this.jdbc = jdbc; this.encoder = encoder; }

    /** Invalida los códigos anteriores y devuelve uno nuevo (el único momento en que existe en claro). */
    public String emitir(String username, String proposito) {
        jdbc.update("UPDATE codigo_verificacion SET usado = TRUE WHERE username = ? AND proposito = ? AND NOT usado", username, proposito);
        String codigo = ReglasCodigo.generar();
        jdbc.update("INSERT INTO codigo_verificacion (username, proposito, codigo_hash, expira) VALUES (?,?,?,?)",
            username, proposito, encoder.encode(codigo), Timestamp.from(Instant.now().plus(ReglasCodigo.VIGENCIA_MINUTOS, ChronoUnit.MINUTES)));
        return codigo;
    }

    public boolean puedeReenviar(String username, String proposito) {
        Integer recientes = jdbc.queryForObject(
            "SELECT COUNT(*) FROM codigo_verificacion WHERE username = ? AND proposito = ? AND creado > ?", Integer.class,
            username, proposito, Timestamp.from(Instant.now().minusSeconds(ReglasCodigo.ESPERA_REENVIO_SEGUNDOS)));
        return recientes == null || recientes == 0;
    }

    public Resultado verificar(String username, String proposito, String codigo) {
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT id, codigo_hash, expira, intentos FROM codigo_verificacion WHERE username = ? AND proposito = ? AND NOT usado ORDER BY id DESC LIMIT 1",
            username, proposito);
        if (filas.isEmpty()) return new Resultado(false, 400, "No hay un código vigente. Pide uno nuevo.");
        Map<String, Object> f = filas.get(0);
        long id = ((Number) f.get("id")).longValue();
        int intentos = ((Number) f.get("intentos")).intValue();
        if (ReglasCodigo.expirado(((Timestamp) f.get("expira")).toInstant(), Instant.now())) {
            jdbc.update("UPDATE codigo_verificacion SET usado = TRUE WHERE id = ?", id);
            return new Resultado(false, 400, "El código venció. Pide uno nuevo.");
        }
        if (ReglasCodigo.sinIntentos(intentos)) {
            jdbc.update("UPDATE codigo_verificacion SET usado = TRUE WHERE id = ?", id);
            return new Resultado(false, 429, "Demasiados intentos. Pide un código nuevo.");
        }
        if (codigo == null || !encoder.matches(codigo.trim(), (String) f.get("codigo_hash"))) {
            jdbc.update("UPDATE codigo_verificacion SET intentos = intentos + 1 WHERE id = ?", id);
            int quedan = ReglasCodigo.MAX_INTENTOS - intentos - 1;
            return new Resultado(false, 400, "Código incorrecto. Te quedan " + Math.max(quedan, 0) + " intentos.");
        }
        jdbc.update("UPDATE codigo_verificacion SET usado = TRUE WHERE id = ?", id);   // un solo uso
        return new Resultado(true, 200, "Código correcto.");
    }
}

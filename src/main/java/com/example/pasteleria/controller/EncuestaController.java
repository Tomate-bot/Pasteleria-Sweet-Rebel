package com.example.pasteleria.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Encuesta de satisfacción: una respuesta por usuario (puede corregirla). Los resultados solo los ve administración. */
@RestController
@RequestMapping("/api/encuesta")
public class EncuestaController {
    private final JdbcTemplate jdbc;
    public EncuestaController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public record Respuesta(Integer general, Integer facilidad, String comentario) {}

    private static ResponseEntity<?> msg(int s, String m) { return ResponseEntity.status(s).body(Map.of("mensaje", m)); }
    private static boolean estrellas(Integer n) { return n != null && n >= 1 && n <= 5; }

    @PostMapping
    public ResponseEntity<?> responder(Authentication auth, @RequestBody Respuesta d) {
        if (d == null || !estrellas(d.general()) || !estrellas(d.facilidad())) return msg(400, "Califica ambas preguntas de 1 a 5 estrellas.");
        String c = d.comentario() == null ? "" : d.comentario().trim();
        if (c.length() > 500) return msg(400, "El comentario admite hasta 500 caracteres.");
        jdbc.update("INSERT INTO encuesta_satisfaccion (username, general, facilidad, comentario) VALUES (?,?,?,?) "
            + "ON CONFLICT (username) DO UPDATE SET general = EXCLUDED.general, facilidad = EXCLUDED.facilidad, comentario = EXCLUDED.comentario, creada = now()",
            auth.getName(), d.general(), d.facilidad(), c);
        return msg(200, "¡Gracias por tu opinión! Nos ayuda a mejorar.");
    }

    @GetMapping("/mia")
    public Object mia(Authentication auth) {
        List<Map<String, Object>> f = jdbc.queryForList("SELECT general, facilidad, comentario FROM encuesta_satisfaccion WHERE username = ?", auth.getName());
        return f.isEmpty() ? Map.of() : f.get(0);
    }

    @GetMapping("/resumen")
    public ResponseEntity<?> resumen(Authentication auth) {
        if (auth.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) return msg(403, "Solo administración ve los resultados.");
        Map<String, Object> r = new java.util.HashMap<>(jdbc.queryForMap(
            "SELECT COUNT(*) AS total, ROUND(AVG(general), 2) AS general, ROUND(AVG(facilidad), 2) AS facilidad FROM encuesta_satisfaccion"));
        r.put("comentarios", jdbc.queryForList("SELECT username, general, facilidad, comentario, creada FROM encuesta_satisfaccion WHERE comentario <> '' ORDER BY creada DESC LIMIT 100"));
        return ResponseEntity.ok(r);
    }
}

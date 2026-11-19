package com.example.pasteleria.controller;

import com.example.pasteleria.service.ReglasCodigo;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/** Solo ADMIN (lo garantiza la regla /api/** de SecurityConfig). Las cuentas de repostero solo se crean aquí. */
@RestController
@RequestMapping("/api/admin/usuarios")
public class AdminUsuariosController {
    private static final Pattern USUARIO = Pattern.compile("[A-Za-z0-9_.@-]{3,50}");
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;

    public AdminUsuariosController(JdbcTemplate jdbc, PasswordEncoder encoder) { this.jdbc = jdbc; this.encoder = encoder; }
    public record NuevoRepostero(String username, String nombre, String email, String password, Long reposteroId) {}
    public record Activo(Boolean enabled) {}

    private static ResponseEntity<?> msg(int s, String m) { return ResponseEntity.status(s).body(Map.of("mensaje", m)); }
    private boolean esAdmin(String u) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM authorities WHERE username = ? AND authority = 'ROLE_ADMIN'", Integer.class, u);
        return n != null && n > 0;
    }
    private boolean existe(String u) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE username = ?", Integer.class, u);
        return n != null && n > 0;
    }

    @GetMapping
    public Object listar() {
        return jdbc.queryForList("SELECT u.username, u.nombre, u.email, u.enabled, COALESCE(string_agg(a.authority, ','), '') AS roles, "
            + "(SELECT r.nombre FROM repostero r WHERE r.usuario = u.username) AS repostero "
            + "FROM users u LEFT JOIN authorities a ON a.username = u.username GROUP BY u.username, u.nombre, u.email, u.enabled ORDER BY u.username LIMIT 500");
    }

    @PostMapping("/repostero")
    @Transactional
    public ResponseEntity<?> crearRepostero(@RequestBody NuevoRepostero d) {
        if (d == null || d.username() == null || d.nombre() == null || d.nombre().isBlank() || d.reposteroId() == null)
            return msg(400, "Usuario, nombre, correo, contraseña y repostero son obligatorios.");
        String user = d.username().trim(), nombre = d.nombre().trim(), email = d.email() == null ? "" : d.email().trim().toLowerCase();
        if (!USUARIO.matcher(user).matches()) return msg(400, "El usuario debe tener 3 a 50 caracteres: letras, números, _, ., @ o -.");
        if (nombre.length() > 100) return msg(400, "El nombre admite hasta 100 caracteres.");
        if (!ReglasCodigo.emailValido(email)) return msg(400, "Escribe un correo válido.");
        if (!ReglasCodigo.passwordValida(d.password())) return msg(400, "La contraseña debe tener entre 12 y 100 caracteres.");
        Integer dup = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE username = ? OR lower(email) = ?", Integer.class, user, email);
        if (dup != null && dup > 0) return msg(409, "Ese usuario o correo ya existe.");
        Integer libre = jdbc.queryForObject("SELECT COUNT(*) FROM repostero WHERE id = ? AND usuario IS NULL AND NOT bloqueado", Integer.class, d.reposteroId());
        if (libre == null || libre == 0) return msg(409, "Ese repostero no existe, está bloqueado o ya tiene cuenta.");
        jdbc.update("INSERT INTO users (username, password, enabled, nombre, email) VALUES (?,?,TRUE,?,?)", user, encoder.encode(d.password()), nombre, email);
        jdbc.update("INSERT INTO authorities (username, authority) VALUES (?, 'ROLE_REPOSTERO')", user);
        jdbc.update("UPDATE repostero SET usuario = ? WHERE id = ?", user, d.reposteroId());
        return msg(201, "Cuenta de repostero creada. Compártele su usuario y contraseña de forma segura.");
    }

    @PatchMapping("/{username}/activo")
    public ResponseEntity<?> activar(Authentication a, @PathVariable String username, @RequestBody Activo d) {
        if (d == null || d.enabled() == null) return msg(400, "Indica si la cuenta queda activa o no.");
        if (!existe(username)) return msg(404, "No existe ese usuario.");
        if (username.equals(a.getName()) || esAdmin(username)) return msg(409, "No se puede cambiar el estado de una cuenta de administración.");
        jdbc.update("UPDATE users SET enabled = ? WHERE username = ?", d.enabled(), username);
        return msg(200, d.enabled() ? "Cuenta activada." : "Cuenta desactivada: ya no podrá iniciar sesión.");
    }

    /** Invalida las sesiones abiertas cambiando el hash de la contraseña; la persona debe usar “Olvidé mi contraseña”. */
    @PostMapping("/{username}/revocar")
    public ResponseEntity<?> revocar(Authentication a, @PathVariable String username) {
        if (!existe(username)) return msg(404, "No existe ese usuario.");
        if (username.equals(a.getName()) || esAdmin(username)) return msg(409, "No se pueden revocar las sesiones de una cuenta de administración.");
        jdbc.update("UPDATE users SET password = ? WHERE username = ?", encoder.encode(UUID.randomUUID().toString()), username);
        return msg(200, "Sesiones cerradas. La persona deberá crear una contraseña nueva con “Olvidé mi contraseña”.");
    }
}

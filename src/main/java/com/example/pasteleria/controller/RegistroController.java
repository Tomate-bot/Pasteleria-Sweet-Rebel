package com.example.pasteleria.controller;

import com.example.pasteleria.model.Cliente;
import com.example.pasteleria.repository.ClienteRepository;
import com.example.pasteleria.service.MailService;
import com.example.pasteleria.service.ReglasCodigo;
import com.example.pasteleria.service.ReglasPerfil;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Registro público (siempre crea un CLIENTE) y recuperación mediante código temporal enviado por correo.
 */
@RestController
@RequestMapping("/api/auth")
public class RegistroController {
    private static final Pattern USUARIO = Pattern.compile("[A-Za-z0-9_.@-]{3,50}");
    private static final int MAX_FALLOS = ReglasCodigo.MAX_INTENTOS, BLOQUEO_MIN = 15;
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final ClienteRepository clientes;
    private final MailService correo;

    public RegistroController(JdbcTemplate jdbc, PasswordEncoder encoder, ClienteRepository clientes, MailService correo) {
        this.jdbc = jdbc; this.encoder = encoder; this.clientes = clientes; this.correo = correo;
    }

    public record Registro(String username, String nombre, String apellidoPaterno, String apellidoMaterno, String email, String telefono, String direccion, String fechaNacimiento, String password) {}
    public record SolicitarRecuperacion(String email) {}
    public record Restablecer(String email, String codigo, String passwordNueva) {}
    public record ConPassword(String passwordActual) {}

    private static ResponseEntity<?> msg(int s, String m) { return ResponseEntity.status(s).body(Map.of("mensaje", m)); }
    private static boolean vacio(String s) { return s == null || s.isBlank(); }

    @PostMapping("/registro")
    @Transactional
    public ResponseEntity<?> registrar(@RequestBody Registro d) {
        if (d == null || vacio(d.username()) || vacio(d.nombre()) || vacio(d.email()) || d.password() == null)
            return msg(400, "Usuario, nombre, correo y contraseña son obligatorios.");
        String user = d.username().trim(), nombre = d.nombre().trim(), email = d.email().trim().toLowerCase();
        String ap = d.apellidoPaterno() == null ? "" : d.apellidoPaterno().trim(), am = d.apellidoMaterno() == null ? "" : d.apellidoMaterno().trim();
        if (!USUARIO.matcher(user).matches()) return msg(400, "El usuario debe tener 3 a 50 caracteres: letras, números, _, ., @ o -.");
        if (!ReglasPerfil.nombreValido(nombre) || !ReglasPerfil.nombreValido(ap)) return msg(400, "Escribe tu nombre y tu apellido paterno (solo letras).");
        if (!am.isEmpty() && !ReglasPerfil.nombreValido(am)) return msg(400, "El apellido materno solo admite letras.");
        String tel = ReglasPerfil.telefono(d.telefono());
        if (tel == null) return msg(400, "El teléfono debe tener 10 dígitos.");
        String dir = d.direccion() == null ? "" : d.direccion().trim();
        if (!ReglasPerfil.direccionValida(dir)) return msg(400, "La dirección admite hasta 250 caracteres.");
        LocalDate nac = null;
        try { if (!vacio(d.fechaNacimiento())) nac = LocalDate.parse(d.fechaNacimiento()); }
        catch (DateTimeParseException ex) { return msg(400, "La fecha de nacimiento no es válida."); }
        if (!ReglasPerfil.fechaNacimientoValida(nac, LocalDate.now())) return msg(400, "La fecha de nacimiento no es válida.");
        String completo = (nombre + " " + ap + " " + am).trim();
        if (completo.length() > 100) return msg(400, "El nombre completo admite hasta 100 caracteres.");
        if (!ReglasCodigo.emailValido(email)) return msg(400, "Escribe un correo válido.");
        if (!ReglasCodigo.passwordValida(d.password())) return msg(400, "La contraseña debe tener entre 12 y 100 caracteres.");
        Integer u = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE username = ?", Integer.class, user);
        if (u != null && u > 0) return msg(409, "Ese nombre de usuario ya está ocupado.");
        Integer e = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE lower(email) = ?", Integer.class, email);
        if ((e != null && e > 0) || clientes.existsByEmailIgnoreCase(email)) return msg(409, "Ese correo ya está registrado.");

        jdbc.update("INSERT INTO users (username, password, enabled, nombre, email, nombres, apellido_paterno, apellido_materno, telefono, direccion, fecha_nacimiento) VALUES (?,?,TRUE,?,?,?,?,?,?,?,?)",
            user, encoder.encode(d.password()), completo, email, nombre, ap, am.isEmpty() ? null : am, tel.isEmpty() ? null : tel, dir.isEmpty() ? null : dir,
            nac == null ? null : java.sql.Date.valueOf(nac));
        jdbc.update("INSERT INTO authorities (username, authority) VALUES (?, 'ROLE_CLIENTE')", user);
        Cliente c = new Cliente();             // vincula la cuenta: así los derechos ARCO funcionan desde el primer día
        c.setNombre(completo); c.setEmail(email); c.setUsuario(user);
        clientes.save(c);
        jdbc.update("UPDATE cliente SET telefono = ? WHERE usuario = ?", tel.isEmpty() ? null : tel, user);
        Map<String, Object> r = new HashMap<>();
        r.put("mensaje", "Cuenta creada. Ya puedes iniciar sesión.");
        r.put("username", user);
        return ResponseEntity.status(201).body(r);
    }

    @PostMapping("/recuperar")
    @Transactional
    public ResponseEntity<?> solicitarRecuperacion(@RequestBody SolicitarRecuperacion d) {
        if (d == null || !ReglasCodigo.emailValido(d.email())) return msg(400, "Escribe un correo válido.");
        String email = d.email().trim().toLowerCase();
        String generico = "Si existe una cuenta activa con ese correo, recibirás un código para restablecer la contraseña.";
        List<Map<String, Object>> cuentas = jdbc.queryForList(
            "SELECT username, rec_codigo_enviado, rec_bloqueo FROM users WHERE lower(email) = ? AND enabled FOR UPDATE", email);
        if (cuentas.isEmpty()) return ResponseEntity.ok(Map.of("mensaje", generico));

        Map<String, Object> cuenta = cuentas.get(0);
        Timestamp bloqueo = (Timestamp) cuenta.get("rec_bloqueo");
        if (bloqueo != null && bloqueo.toInstant().isAfter(Instant.now()))
            return ResponseEntity.ok(Map.of("mensaje", generico));
        Timestamp ultimaSolicitud = (Timestamp) cuenta.get("rec_codigo_enviado");
        if (ultimaSolicitud != null && ultimaSolicitud.toInstant()
                .plusSeconds(ReglasCodigo.ESPERA_REENVIO_SEGUNDOS).isAfter(Instant.now()))
            return ResponseEntity.ok(Map.of("mensaje", generico));

        String user = (String) cuenta.get("username");
        String codigo = ReglasCodigo.generar();
        Instant ahora = Instant.now();
        jdbc.update("UPDATE users SET rec_codigo_hash = ?, rec_codigo_expira = ?, rec_codigo_enviado = ?, rec_intentos = 0, rec_bloqueo = NULL WHERE username = ?",
            encoder.encode(codigo), Timestamp.from(ahora.plusSeconds(ReglasCodigo.VIGENCIA_MINUTOS * 60L)),
            Timestamp.from(ahora), user);
        String texto = "Tu código para restablecer la contraseña de Sweet Rebel es: " + codigo
            + "\n\nEl código vence en " + ReglasCodigo.VIGENCIA_MINUTOS
            + " minutos y solo puede utilizarse una vez. Si no solicitaste este cambio, ignora este correo.";
        if (!correo.enviar(email, "Código para recuperar tu cuenta de Sweet Rebel", texto)) {
            jdbc.update("UPDATE users SET rec_codigo_hash = NULL, rec_codigo_expira = NULL, rec_codigo_enviado = NULL WHERE username = ?", user);
            return msg(503, "No se pudo enviar el correo. Inténtalo más tarde o contacta a administración.");
        }
        return ResponseEntity.ok(Map.of("mensaje", generico));
    }

    /** Cambia la contraseña con el código temporal enviado al correo o un código de respaldo anterior. */
    @PostMapping("/recuperar/confirmar")
    @Transactional
    public ResponseEntity<?> restablecer(@RequestBody Restablecer d) {
        if (d == null || !ReglasCodigo.emailValido(d.email()) || vacio(d.codigo())) return msg(400, "Escribe tu correo y el código que recibiste.");
        if (!ReglasCodigo.passwordValida(d.passwordNueva())) return msg(400, "La contraseña debe tener entre 12 y 100 caracteres.");
        String generico = "El correo o el código no son correctos, vencieron o ya fueron utilizados.";
        List<Map<String, Object>> f = jdbc.queryForList(
            "SELECT username, recuperacion_hash, rec_codigo_hash, rec_codigo_expira, rec_intentos, rec_bloqueo FROM users WHERE lower(email) = ? AND enabled FOR UPDATE",
            d.email().trim().toLowerCase());
        if (f.isEmpty()) return msg(400, generico);
        Map<String, Object> u = f.get(0);
        String user = (String) u.get("username");
        Timestamp bloqueo = (Timestamp) u.get("rec_bloqueo");
        if (bloqueo != null && bloqueo.toInstant().isAfter(Instant.now())) return msg(429, "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");

        String codigo = d.codigo().trim();
        if (codigo.length() > 20) return msg(400, generico);
        String codigoHash = (String) u.get("rec_codigo_hash");
        Timestamp expira = (Timestamp) u.get("rec_codigo_expira");
        boolean codigoCorreoValido = codigo.matches("\\d{6}") && codigoHash != null && expira != null
            && !ReglasCodigo.expirado(expira.toInstant(), Instant.now()) && encoder.matches(codigo, codigoHash);
        String codigoRespaldoHash = (String) u.get("recuperacion_hash");
        boolean codigoRespaldoValido = codigoRespaldoHash != null
            && encoder.matches(ReglasCodigo.normalizarRecuperacion(codigo), codigoRespaldoHash);
        if (!codigoCorreoValido && !codigoRespaldoValido) {
            int fallos = ((Number) u.get("rec_intentos")).intValue() + 1;
            jdbc.update("UPDATE users SET rec_intentos = ?, rec_bloqueo = ? WHERE username = ?", fallos >= MAX_FALLOS ? 0 : fallos,
                fallos >= MAX_FALLOS ? Timestamp.from(Instant.now().plusSeconds(BLOQUEO_MIN * 60L)) : null, user);
            return msg(400, generico);
        }
        jdbc.update("UPDATE users SET password = ?, recuperacion_hash = NULL, rec_codigo_hash = NULL, rec_codigo_expira = NULL, rec_codigo_enviado = NULL, rec_intentos = 0, rec_bloqueo = NULL WHERE username = ?",
            encoder.encode(d.passwordNueva()), user);
        return ResponseEntity.ok(Map.of("mensaje", "Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña."));
    }

    /** Con sesión: genera (o regenera) el código de recuperación. Sirve a cuentas anteriores, como admin. Pide la contraseña actual. */
    @PostMapping("/codigo-recuperacion")
    public ResponseEntity<?> nuevoCodigo(Authentication a, @RequestBody ConPassword d) {
        if (d == null || vacio(d.passwordActual())) return msg(400, "Escribe tu contraseña actual.");
        String hash = jdbc.queryForObject("SELECT password FROM users WHERE username = ?", String.class, a.getName());
        if (hash == null || !encoder.matches(d.passwordActual(), hash)) return msg(400, "La contraseña actual no es correcta.");
        String codigo = ReglasCodigo.generarRecuperacion();
        jdbc.update("UPDATE users SET recuperacion_hash = ?, rec_intentos = 0, rec_bloqueo = NULL WHERE username = ?", encoder.encode(ReglasCodigo.normalizarRecuperacion(codigo)), a.getName());
        return ResponseEntity.ok(Map.of("mensaje", "Listo. Guarda este código: reemplaza al anterior.", "codigoRecuperacion", codigo));
    }
}

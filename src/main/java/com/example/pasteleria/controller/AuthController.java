package com.example.pasteleria.controller;

import com.example.pasteleria.model.Cliente;
import com.example.pasteleria.repository.ClienteRepository;
import com.example.pasteleria.security.JwtService;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Pattern USUARIO_PERMITIDO = Pattern.compile("[A-Za-z0-9_.@-]{3,50}");
    private final UserDetailsService usuarios;
    private final PasswordEncoder encoder;
    private final JwtService tokens;
    private final JdbcTemplate jdbc;
    private final ClienteRepository clientes;

    public AuthController(UserDetailsService usuarios, PasswordEncoder encoder,
                          JwtService tokens, JdbcTemplate jdbc, ClienteRepository clientes) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.tokens = tokens;
        this.jdbc = jdbc;
        this.clientes = clientes;
    }

    @PostMapping("/login")
    public ResponseEntity<?> entrar(@RequestBody Credenciales credenciales) {
        if (credenciales == null || credenciales.username() == null || credenciales.password() == null) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "username y password son obligatorios."));
        }
        try {
            UserDetails usuario = usuarios.loadUserByUsername(credenciales.username());
            if (!usuario.isEnabled() || !usuario.isAccountNonLocked()
                    || !usuario.isAccountNonExpired() || !usuario.isCredentialsNonExpired()
                    || !encoder.matches(credenciales.password(), usuario.getPassword())) {
                return ResponseEntity.status(401).body(Map.of("mensaje", "Credenciales incorrectas."));
            }
            // El token queda vinculado a la contraseña actual: al cambiarla, deja de ser válido.
            return ResponseEntity.ok(Map.of(
                "access_token", tokens.crear(usuario.getUsername(), usuario.getPassword()),
                "token_type", "Bearer",
                "expires_in", tokens.vigenciaSegundos()
            ));
        } catch (UsernameNotFoundException ex) {
            return ResponseEntity.status(401).body(Map.of("mensaje", "Credenciales incorrectas."));
        }
    }

    @GetMapping("/perfil")
    public ResponseEntity<?> miPerfil(Principal principal) {
        String username = principal.getName();
        UserDetails cuenta = usuarios.loadUserByUsername(username);
        String nombre = jdbc.queryForObject(
            "SELECT nombre FROM users WHERE username = ?", String.class, username);
        List<String> roles = cuenta.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority).sorted().toList();
        return ResponseEntity.ok(new VistaPerfil(username, nombre, roles));
    }

    /** Cambia el nombre visible. No altera 'username', los roles ni los permisos. */
    @PutMapping("/perfil")
    @Transactional
    public ResponseEntity<?> actualizarPerfil(Principal principal, @RequestBody DatosPerfil datos) {
        if (datos == null || datos.nombre() == null || datos.nombre().isBlank()
                || datos.nombre().trim().length() > 100) {
            return ResponseEntity.badRequest().body(Map.of(
                "mensaje", "nombre es obligatorio (máximo 100 caracteres)."));
        }
        String username = principal.getName();
        String nombre = datos.nombre().trim();
        Optional<Cliente> cliente = clientes.findByUsuario(username);
        if (cliente.isPresent()) {
            Cliente titular = cliente.get();
            if (titular.isCancelado()) {
                return ResponseEntity.status(409).body(Map.of(
                    "mensaje", "El perfil del cliente está cancelado."));
            }
            // Evita que el perfil de autenticación y los datos ARCO tengan nombres distintos.
            titular.setNombre(nombre);
            clientes.save(titular);
        }
        jdbc.update("UPDATE users SET nombre = ? WHERE username = ?", nombre, username);
        return miPerfil(principal);
    }

    /**
     * Modifica el username (clave de inicio de sesión) de la cuenta autenticada.
     * La BD debe tener ON UPDATE CASCADE en authorities y cliente (ver migración SQL).
     * Después de la operación, el JWT anterior deja de funcionar porque su sub es el antiguo usuario.
     */
    @PutMapping("/cambiar-usuario")
    @Transactional
    public ResponseEntity<?> cambiarUsuario(Principal principal, @RequestBody CambioUsuario datos) {
        if (datos == null || datos.usernameNuevo() == null || datos.passwordActual() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "mensaje", "usernameNuevo y passwordActual son obligatorios."));
        }
        String nuevo = datos.usernameNuevo().trim();
        String actual = principal.getName();
        if (!USUARIO_PERMITIDO.matcher(nuevo).matches()) {
            return ResponseEntity.badRequest().body(Map.of(
                "mensaje", "usernameNuevo debe tener 3 a 50 caracteres: letras, números, _, ., @ o -."));
        }
        if (nuevo.equals(actual)) {
            return ResponseEntity.badRequest().body(Map.of(
                "mensaje", "El nuevo nombre de usuario debe ser diferente del actual."));
        }
        UserDetails cuenta = usuarios.loadUserByUsername(actual);
        if (!encoder.matches(datos.passwordActual(), cuenta.getPassword())) {
            return ResponseEntity.status(403).body(Map.of("mensaje", "La contraseña actual no coincide."));
        }
        if (clientes.findByUsuario(actual).filter(Cliente::isCancelado).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("mensaje", "No puede modificarse una cuenta cancelada."));
        }
        Integer coincidencias = jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE username = ?", Integer.class, nuevo);
        if (coincidencias != null && coincidencias > 0) {
            return ResponseEntity.status(409).body(Map.of("mensaje", "El nombre de usuario ya está ocupado."));
        }
        // ON UPDATE CASCADE conserva automáticamente roles y vínculo del cliente.
        // La comparación del hash también evita pisar cambios simultáneos de contraseña.
        int cambiadas = jdbc.update(
            "UPDATE users SET username = ? WHERE username = ? AND password = ?",
            nuevo, actual, cuenta.getPassword());
        if (cambiadas != 1) {
            return ResponseEntity.status(409).body(Map.of(
                "mensaje", "La cuenta cambió durante la solicitud. Vuelve a iniciar sesión."));
        }
        return ResponseEntity.ok(Map.of(
            "mensaje", "Nombre de usuario actualizado. Inicia sesión nuevamente.",
            "usernameAnterior", actual,
            "usernameNuevo", nuevo
        ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> errorIntegridad(DataIntegrityViolationException ex) {
        return ResponseEntity.status(409).body(Map.of(
            "mensaje", "No se pudo actualizar el usuario. Verifica que no exista y aplica la migración SQL."));
    }

    /** Cambia únicamente la contraseña de la cuenta autenticada. */
    @PutMapping("/cambiar-password")
    public ResponseEntity<?> cambiarPassword(Principal principal, @RequestBody CambioPassword datos) {
        if (datos == null || datos.passwordActual() == null || datos.passwordNueva() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "mensaje", "passwordActual y passwordNueva son obligatorios."));
        }
        String nueva = datos.passwordNueva();
        if (nueva.length() < 12 || nueva.getBytes(StandardCharsets.UTF_8).length > 72) {
            return ResponseEntity.badRequest().body(Map.of(
                "mensaje", "La nueva contraseña debe tener al menos 12 caracteres y máximo 72 bytes UTF-8."));
        }
        UserDetails cuenta = usuarios.loadUserByUsername(principal.getName());
        if (!encoder.matches(datos.passwordActual(), cuenta.getPassword())) {
            return ResponseEntity.status(403).body(Map.of("mensaje", "La contraseña actual no coincide."));
        }
        if (encoder.matches(nueva, cuenta.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "La contraseña nueva debe ser diferente."));
        }
        String nuevoHash = encoder.encode(nueva);
        // La condición sobre el hash impide sobrescribir un cambio simultáneo.
        int actualizados = jdbc.update(
            "UPDATE users SET password = ? WHERE username = ? AND password = ?",
            nuevoHash, principal.getName(), cuenta.getPassword());
        if (actualizados != 1) {
            return ResponseEntity.status(409).body(Map.of(
                "mensaje", "La contraseña cambió durante la operación. Inicia sesión de nuevo."));
        }
        return ResponseEntity.ok(Map.of(
            "mensaje", "Contraseña cambiada. Inicia sesión otra vez; los tokens anteriores ya no funcionan."));
    }

    public record Credenciales(String username, String password) {}
    public record DatosPerfil(String nombre) {}
    public record CambioPassword(String passwordActual, String passwordNueva) {}
    public record CambioUsuario(String usernameNuevo, String passwordActual) {}
    public record VistaPerfil(String username, String nombre, List<String> roles) {}
}

package com.example.pasteleria.controller;

import com.example.pasteleria.service.ReglasPerfil;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/** Datos personales y foto del usuario con sesión (cualquier rol). Cada quien solo toca lo suyo. */
@RestController
@RequestMapping("/api/perfil")
public class PerfilController {
    private final JdbcTemplate jdbc;
    public PerfilController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public record Datos(String nombre, String apellidoPaterno, String apellidoMaterno, String telefono, String direccion, String fechaNacimiento) {}
    public record Foto(String imagen) {}

    private static ResponseEntity<?> msg(int s, String m) { return ResponseEntity.status(s).body(Map.of("mensaje", m)); }

    @GetMapping
    public Object ver(Authentication a) {
        return jdbc.queryForMap("SELECT username, nombre, nombres, apellido_paterno AS \"apellidoPaterno\", apellido_materno AS \"apellidoMaterno\", email, telefono, direccion, "
            + "fecha_nacimiento AS \"fechaNacimiento\", (foto IS NOT NULL) AS \"tieneFoto\" FROM users WHERE username = ?", a.getName());
    }

    @PutMapping
    public ResponseEntity<?> guardar(Authentication a, @RequestBody Datos d) {
        if (d == null || !ReglasPerfil.nombreValido(d.nombre()) || !ReglasPerfil.nombreValido(d.apellidoPaterno()))
            return msg(400, "Escribe tu nombre y tu apellido paterno (solo letras).");
        String nom = d.nombre().trim(), ap = d.apellidoPaterno().trim(), am = d.apellidoMaterno() == null ? "" : d.apellidoMaterno().trim();
        if (!am.isEmpty() && !ReglasPerfil.nombreValido(am)) return msg(400, "El apellido materno solo admite letras.");
        String tel = ReglasPerfil.telefono(d.telefono());
        if (tel == null) return msg(400, "El teléfono debe tener 10 dígitos.");
        String dir = d.direccion() == null ? "" : d.direccion().trim();
        if (!ReglasPerfil.direccionValida(dir)) return msg(400, "La dirección admite hasta 250 caracteres.");
        LocalDate nac = null;
        try { if (d.fechaNacimiento() != null && !d.fechaNacimiento().isBlank()) nac = LocalDate.parse(d.fechaNacimiento()); }
        catch (DateTimeParseException e) { return msg(400, "La fecha de nacimiento no es válida."); }
        if (!ReglasPerfil.fechaNacimientoValida(nac, LocalDate.now())) return msg(400, "La fecha de nacimiento no es válida.");
        String completo = (nom + " " + ap + " " + am).trim();
        if (completo.length() > 100) return msg(400, "El nombre completo admite hasta 100 caracteres.");
        jdbc.update("UPDATE users SET nombre = ?, nombres = ?, apellido_paterno = ?, apellido_materno = ?, telefono = ?, direccion = ?, fecha_nacimiento = ? WHERE username = ?",
            completo, nom, ap, am.isEmpty() ? null : am, tel.isEmpty() ? null : tel, dir.isEmpty() ? null : dir, nac == null ? null : Date.valueOf(nac), a.getName());
        jdbc.update("UPDATE cliente SET nombre = ?, telefono = ? WHERE usuario = ? AND NOT cancelado", completo, tel.isEmpty() ? null : tel, a.getName());
        return msg(200, "Listo: tus datos se guardaron.");
    }

    @PutMapping("/foto")
    public ResponseEntity<?> subirFoto(Authentication a, @RequestBody Foto f) {
        if (f == null || f.imagen() == null) return msg(400, "Elige una imagen.");
        String b64 = f.imagen().contains(",") ? f.imagen().substring(f.imagen().indexOf(',') + 1) : f.imagen();
        byte[] bytes;
        try { bytes = Base64.getDecoder().decode(b64); } catch (IllegalArgumentException e) { return msg(400, "La imagen no es válida."); }
        String tipo = ReglasPerfil.tipoImagen(bytes);
        if (tipo == null) return msg(400, "Usa una imagen JPG, PNG o WebP de máximo 200 KB.");
        jdbc.update("UPDATE users SET foto = ?, foto_tipo = ? WHERE username = ?", bytes, tipo, a.getName());
        return msg(200, "Foto actualizada.");
    }

    @GetMapping("/foto")
    public ResponseEntity<?> foto(Authentication a) {
        List<Map<String, Object>> f = jdbc.queryForList("SELECT foto, foto_tipo FROM users WHERE username = ? AND foto IS NOT NULL", a.getName());
        if (f.isEmpty()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType((String) f.get(0).get("foto_tipo")))
            .header("X-Content-Type-Options", "nosniff").cacheControl(CacheControl.noStore()).body((byte[]) f.get(0).get("foto"));
    }

    @DeleteMapping("/foto")
    public ResponseEntity<?> quitarFoto(Authentication a) {
        jdbc.update("UPDATE users SET foto = NULL, foto_tipo = NULL WHERE username = ?", a.getName());
        return msg(200, "Foto eliminada.");
    }
}

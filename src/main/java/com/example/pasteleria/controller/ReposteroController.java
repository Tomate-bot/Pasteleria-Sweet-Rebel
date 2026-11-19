package com.example.pasteleria.controller;

import com.example.pasteleria.model.Repostero;
import com.example.pasteleria.repository.ProductoRepository;
import com.example.pasteleria.repository.ReposteroRepository;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reposteros")
public class ReposteroController {
    private final ReposteroRepository reposteros;
    private final ProductoRepository productos;

    public ReposteroController(ReposteroRepository reposteros, ProductoRepository productos) {
        this.reposteros = reposteros;
        this.productos = productos;
    }

    @GetMapping public List<Repostero> listar() {
        return reposteros.findAll().stream().filter(r -> !r.isBloqueado()).toList();
    }
    @GetMapping("/{id}") public ResponseEntity<?> obtener(@PathVariable("id") Long id) {
        return reposteros.findById(id).map(r -> {
            if (r.isBloqueado()) return ResponseEntity.ok(Map.of("id", r.getId(), "nombre", "Repostero anónimo", "ciudad", "Oculta", "bloqueado", true));
            return ResponseEntity.ok(r);
        }).orElse(ResponseEntity.notFound().build());
    }
    @PostMapping public ResponseEntity<?> crear(@RequestBody Repostero datos) {
        if (datos.getNombre() == null || datos.getNombre().isBlank() || datos.getCiudad() == null || datos.getCiudad().isBlank())
            return ResponseEntity.badRequest().body(Map.of("mensaje", "nombre y ciudad son obligatorios."));
        Repostero nuevo = new Repostero();
        nuevo.setNombre(datos.getNombre().trim()); nuevo.setCiudad(datos.getCiudad().trim());
        return ResponseEntity.status(201).body(reposteros.save(nuevo));
    }
    @PutMapping("/{id}") public ResponseEntity<?> editar(@PathVariable("id") Long id, @RequestBody Repostero datos) {
        return reposteros.findById(id).map(r -> {
            if (r.isBloqueado()) return ResponseEntity.status(403).body(Map.of("mensaje", "No se puede rectificar: el repostero se opuso al tratamiento."));
            if (datos.getNombre() == null || datos.getNombre().isBlank() || datos.getCiudad() == null || datos.getCiudad().isBlank())
                return ResponseEntity.badRequest().body(Map.of("mensaje", "nombre y ciudad son obligatorios."));
            r.setNombre(datos.getNombre()); r.setCiudad(datos.getCiudad());
            return ResponseEntity.ok(reposteros.save(r));
        }).orElse(ResponseEntity.notFound().build());
    }
     @DeleteMapping("/{id}") public ResponseEntity<?> eliminar(@PathVariable("id") Long id) {
        if (!reposteros.existsById(id)) return ResponseEntity.notFound().build();
        if (productos.existsByReposteroId(id)) return ResponseEntity.status(409).body(Map.of("mensaje", "No se puede cancelar: el repostero tiene productos asociados."));
        reposteros.deleteById(id);
        return ResponseEntity.noContent().build();
    }
    @PatchMapping("/{id}/oposicion") public ResponseEntity<?> oponerse(@PathVariable("id") Long id) {
        return reposteros.findById(id).map(r -> {
            r.setBloqueado(true); reposteros.save(r);
            return ResponseEntity.ok(Map.of("mensaje", "Oposición aplicada; sus datos se ocultan en el catálogo.", "id", id));
        }).orElse(ResponseEntity.notFound().build());
    }
}

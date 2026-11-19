package com.example.pasteleria.controller;

import com.example.pasteleria.model.Categoria;
import com.example.pasteleria.repository.CategoriaRepository;
import com.example.pasteleria.repository.ProductoRepository;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/categorias")
public class CategoriaController {
    private final CategoriaRepository categorias;
    private final ProductoRepository productos;

    public CategoriaController(CategoriaRepository categorias, ProductoRepository productos) {
        this.categorias = categorias;
        this.productos = productos;
    }

    @GetMapping public List<Categoria> listar() { return categorias.findAll(); }
    @GetMapping("/{id}") public ResponseEntity<Categoria> obtener(@PathVariable("id") Long id) {
        return categorias.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
    @PostMapping public ResponseEntity<?> crear(@RequestBody Categoria categoria) {
        if (categoria.getNombre() == null || categoria.getNombre().isBlank())
            return ResponseEntity.badRequest().body(Map.of("mensaje", "nombre es obligatorio."));
        Categoria nueva = new Categoria(); nueva.setNombre(categoria.getNombre().trim());
        return ResponseEntity.status(201).body(categorias.save(nueva));
    }
    @PutMapping("/{id}") public ResponseEntity<Categoria> editar(@PathVariable("id") Long id, @RequestBody Categoria datos) {
        if (datos.getNombre() == null || datos.getNombre().isBlank()) return ResponseEntity.badRequest().build();
        return categorias.findById(id).map(c -> { c.setNombre(datos.getNombre().trim()); return ResponseEntity.ok(categorias.save(c)); })
            .orElse(ResponseEntity.notFound().build());
    }
    @DeleteMapping("/{id}") public ResponseEntity<?> eliminar(@PathVariable("id") Long id) {
        if (!categorias.existsById(id)) return ResponseEntity.notFound().build();
        if (productos.existsByCategoriaId(id)) return ResponseEntity.status(409).body(Map.of("mensaje", "La categoría tiene productos asociados."));
        categorias.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

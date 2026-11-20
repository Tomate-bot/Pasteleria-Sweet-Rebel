package com.example.pasteleria.controller;

import com.example.pasteleria.model.Producto;
import com.example.pasteleria.model.Repostero;
import com.example.pasteleria.repository.CategoriaRepository;
import com.example.pasteleria.repository.ProductoRepository;
import com.example.pasteleria.repository.PedidoRepository;
import com.example.pasteleria.repository.ReposteroRepository;
import com.example.pasteleria.service.ReglasPerfil;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {
    private final ProductoRepository productos;
    private final ReposteroRepository reposteros;
    private final CategoriaRepository categorias;
    private final PedidoRepository pedidos;

    public ProductoController(ProductoRepository productos, ReposteroRepository reposteros, CategoriaRepository categorias, PedidoRepository pedidos) {
        this.productos = productos; this.reposteros = reposteros; this.categorias = categorias; this.pedidos = pedidos;
    }

    @GetMapping public List<VistaProducto> listar() { return productos.findAll().stream().map(this::ocultarRepostero).toList(); }
    @GetMapping("/{id}") public ResponseEntity<VistaProducto> obtener(@PathVariable("id") Long id) {
        return productos.findById(id).map(p -> ResponseEntity.ok(ocultarRepostero(p))).orElse(ResponseEntity.notFound().build());
    }
    @PostMapping public ResponseEntity<?> crear(@RequestBody DatosProducto datos) {
        ResponseEntity<?> error = validar(datos); if (error != null) return error;
        Producto p = new Producto(); llenar(p, datos);
        return ResponseEntity.ok(productos.save(p));
    }
     @PutMapping("/{id}") public ResponseEntity<?> editar(@PathVariable("id") Long id, @RequestBody DatosProducto datos) {
        ResponseEntity<?> error = validar(datos); if (error != null) return error;
        return productos.findById(id).map(p -> { llenar(p, datos); return ResponseEntity.ok(productos.save(p)); })
            .orElse(ResponseEntity.notFound().build());
    }
    @DeleteMapping("/{id}") public ResponseEntity<Void> eliminar(@PathVariable("id") Long id) {
        if (!productos.existsById(id)) return ResponseEntity.notFound().build();
        if (pedidos.existsByProductoId(id)) return ResponseEntity.status(409).build();
        productos.deleteById(id); return ResponseEntity.noContent().build();
    }

    private ResponseEntity<?> validar(DatosProducto d) {
        if (d == null || !ReglasPerfil.textoCortoValido(d.nombre()) || d.nombre().trim().length() > 150
                || d.precio() == null || d.precio().compareTo(BigDecimal.ZERO) <= 0
                || d.precio().scale() > 2 || !ReglasPerfil.descripcionValida(d.descripcion())
                || d.reposteroId() == null || d.categoriaId() == null)
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Indica nombre, precio válido, reposteroId y categoriaId."));
        if (!reposteros.existsById(d.reposteroId()) || !categorias.existsById(d.categoriaId()))
            return ResponseEntity.badRequest().body(Map.of("mensaje", "El repostero o categoría no existe."));
        if (reposteros.findById(d.reposteroId()).orElseThrow().isBloqueado())
            return ResponseEntity.status(403).body(Map.of("mensaje", "No se puede publicar producto de un repostero que ejerció oposición."));
        return null;
    }
    private void llenar(Producto p, DatosProducto d) {
        p.setNombre(d.nombre().trim()); p.setDescripcion(d.descripcion() == null ? null : d.descripcion().trim()); p.setPrecio(d.precio());
        p.setRepostero(reposteros.findById(d.reposteroId()).orElseThrow());
        p.setCategoria(categorias.findById(d.categoriaId()).orElseThrow());
    }
    // DTO de salida: nunca se cambia la entidad JPA administrada para ocultar datos.
    private VistaProducto ocultarRepostero(Producto p) {
        Repostero r = p.getRepostero();
        VistaRepostero vista = r.isBloqueado()
            ? new VistaRepostero(null, "Repostero anónimo", "Oculta", true)
            : new VistaRepostero(r.getId(), r.getNombre(), r.getCiudad(), false);
        return new VistaProducto(p.getId(), p.getNombre(), p.getDescripcion(), p.getPrecio(), vista, p.getCategoria());
    }
    public record VistaRepostero(Long id, String nombre, String ciudad, boolean bloqueado) {}
    public record VistaProducto(Long id, String nombre, String descripcion, BigDecimal precio, VistaRepostero repostero, com.example.pasteleria.model.Categoria categoria) {}
    public record DatosProducto(String nombre, String descripcion, BigDecimal precio, Long reposteroId, Long categoriaId) {}
}

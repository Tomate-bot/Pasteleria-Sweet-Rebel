package com.example.pasteleria.controller;

import com.example.pasteleria.model.Pedido;
import com.example.pasteleria.model.Cliente;
import com.example.pasteleria.model.Producto;
import com.example.pasteleria.repository.ClienteRepository;
import com.example.pasteleria.repository.PedidoRepository;
import com.example.pasteleria.repository.ProductoRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {
    private static final Set<String> ESTADOS = Set.of("PENDIENTE", "PREPARANDO", "ENTREGADO", "CANCELADO");
    private final PedidoRepository pedidos;
    private final ClienteRepository clientes;
    private final ProductoRepository productos;

    public PedidoController(PedidoRepository pedidos, ClienteRepository clientes, ProductoRepository productos) {
        this.pedidos = pedidos; this.clientes = clientes; this.productos = productos;
    }

    @GetMapping public List<Pedido> listar() { return pedidos.findAll(); }
    @GetMapping("/{id}") public ResponseEntity<Pedido> obtener(@PathVariable Long id) {
        return pedidos.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
    @PostMapping public ResponseEntity<?> crear(@RequestBody DatosPedido datos) {
        String error = validar(datos);
        if (error != null) return ResponseEntity.badRequest().body(Map.of("mensaje", error));
        Pedido p = new Pedido(); p.setFechaPedido(LocalDateTime.now()); llenar(p, datos);
        return ResponseEntity.status(201).body(pedidos.save(p));
    }
    @PutMapping("/{id}") public ResponseEntity<?> editar(@PathVariable Long id, @RequestBody DatosPedido datos) {
        String error = validar(datos);
        if (error != null) return ResponseEntity.badRequest().body(Map.of("mensaje", error));
        return pedidos.findById(id).map(p -> { llenar(p, datos); return ResponseEntity.ok(pedidos.save(p)); })
            .orElse(ResponseEntity.notFound().build());
    }
    @DeleteMapping("/{id}") public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!pedidos.existsById(id)) return ResponseEntity.notFound().build();
        pedidos.deleteById(id); return ResponseEntity.noContent().build();
    }

    private String validar(DatosPedido d) {
        if (d == null || d.clienteId() == null || d.productoId() == null || d.cantidad() == null || d.cantidad() < 1 || d.cantidad() > 1000)
            return "clienteId, productoId y cantidad entre 1 y 1000 son obligatorios.";
        if (d.estado() == null || !ESTADOS.contains(d.estado()))
            return "estado debe ser PENDIENTE, PREPARANDO, ENTREGADO o CANCELADO.";
        Cliente c = clientes.findById(d.clienteId()).orElse(null);
        if (c == null) return "No existe el cliente.";
        if (c.isCancelado() || c.isOposicion()) return "El cliente tiene cancelación u oposición registrada.";
        if (!productos.existsById(d.productoId())) return "No existe el producto.";
        return null;
    }
    private void llenar(Pedido p, DatosPedido d) {
        Cliente c = clientes.findById(d.clienteId()).orElseThrow();
        Producto prod = productos.findById(d.productoId()).orElseThrow();
        p.setCliente(c); p.setProducto(prod); p.setCantidad(d.cantidad());
        p.setTotal(prod.getPrecio().multiply(java.math.BigDecimal.valueOf(d.cantidad())));
        p.setEstado(d.estado());
    }
    public record DatosPedido(Long clienteId, Long productoId, Integer cantidad, String estado) {}
}

package com.example.pasteleria.controller;

import com.example.pasteleria.model.Cliente;
import com.example.pasteleria.model.Pedido;
import com.example.pasteleria.model.Producto;
import com.example.pasteleria.repository.ClienteRepository;
import com.example.pasteleria.repository.PedidoRepository;
import com.example.pasteleria.repository.ProductoRepository;
import com.example.pasteleria.service.ReglasCompra;
import com.example.pasteleria.service.ReglasEtapa;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Panel del repostero/chef: solo ve y toca lo que corresponde a SUS productos. Nada de administración ni ARCO. */
@RestController
@RequestMapping("/api/chef")
public class ChefController {
    private final JdbcTemplate jdbc;
    private final ClienteRepository clientes;
    private final ProductoRepository productos;
    private final PedidoRepository pedidos;

    public ChefController(JdbcTemplate jdbc, ClienteRepository clientes, ProductoRepository productos, PedidoRepository pedidos) {
        this.jdbc = jdbc; this.clientes = clientes; this.productos = productos; this.pedidos = pedidos;
    }
    public record NuevoPedido(Long clienteId, Long productoId, Integer cantidad) {}
    public record Etapa(String estado) {}

    private static ResponseEntity<?> msg(int s, String m) { return ResponseEntity.status(s).body(Map.of("mensaje", m)); }
    private Optional<Long> miId(Authentication a) {
        return jdbc.query("SELECT id FROM repostero WHERE usuario = ? AND NOT bloqueado", (rs, i) -> rs.getLong(1), a.getName()).stream().findFirst();
    }
    private static final ResponseEntity<?> SIN_PERFIL = msg(409, "Tu cuenta aún no está vinculada a un repostero. Pide ayuda a administración.");

    @GetMapping("/mis-pasteles")
    public ResponseEntity<?> pasteles(Authentication a) {
        Optional<Long> id = miId(a);
        if (id.isEmpty()) return SIN_PERFIL;
        return ResponseEntity.ok(jdbc.queryForList(
            "SELECT pr.id, pr.nombre, pr.precio, COUNT(ped.id) AS pedidos, COALESCE(SUM(ped.cantidad), 0) AS unidades "
            + "FROM producto pr LEFT JOIN pedido ped ON ped.id_producto = pr.id AND ped.estado <> 'CANCELADO' "
            + "WHERE pr.id_repostero = ? GROUP BY pr.id, pr.nombre, pr.precio ORDER BY unidades DESC, pr.nombre LIMIT 300", id.get()));
    }

    @GetMapping("/pedidos")
    public ResponseEntity<?> pedidos(Authentication a) {
        Optional<Long> id = miId(a);
        if (id.isEmpty()) return SIN_PERFIL;
        return ResponseEntity.ok(jdbc.queryForList(
            "SELECT ped.id, c.nombre AS cliente, pr.nombre AS producto, ped.cantidad, ped.total, ped.estado, ped.fecha_pedido AS fecha "
            + "FROM pedido ped JOIN producto pr ON pr.id = ped.id_producto JOIN cliente c ON c.id = ped.id_cliente "
            + "WHERE pr.id_repostero = ? ORDER BY ped.id DESC LIMIT 300", id.get()));
    }

    @GetMapping("/productos")
    public ResponseEntity<?> misProductos(Authentication a) {
        Optional<Long> id = miId(a);
        return id.isEmpty() ? SIN_PERFIL : ResponseEntity.ok(jdbc.queryForList("SELECT id, nombre, precio FROM producto WHERE id_repostero = ? ORDER BY nombre LIMIT 300", id.get()));
    }

    /** Búsqueda mínima de clientes (solo id y nombre; sin correo ni teléfono). */
    @GetMapping("/clientes")
    public Object clientes(@RequestParam(defaultValue = "") String q) {
        if (q.trim().length() < 2) return List.of();
        return jdbc.queryForList("SELECT id, nombre FROM cliente WHERE NOT cancelado AND NOT oposicion AND lower(nombre) LIKE ? ORDER BY nombre LIMIT 20",
            "%" + q.trim().toLowerCase().replace("%", "").replace("_", "") + "%");
    }

    @PostMapping("/pedidos")
    public ResponseEntity<?> registrar(Authentication a, @RequestBody NuevoPedido d) {
        Optional<Long> id = miId(a);
        if (id.isEmpty()) return SIN_PERFIL;
        if (d == null || d.clienteId() == null || d.productoId() == null || d.cantidad() == null || !ReglasCompra.cantidadValida(d.cantidad()))
            return msg(400, "Elige cliente, producto y una cantidad entre 1 y 1000.");
        Optional<Producto> p = productos.findById(d.productoId());
        Integer suyo = jdbc.queryForObject("SELECT COUNT(*) FROM producto WHERE id = ? AND id_repostero = ?", Integer.class, d.productoId(), id.get());
        if (p.isEmpty() || suyo == null || suyo == 0) return msg(404, "Ese pastel no está entre los tuyos.");
        Optional<Cliente> c = clientes.findById(d.clienteId());
        if (c.isEmpty()) return msg(404, "No encontramos a ese cliente.");
        if (c.get().isCancelado() || c.get().isOposicion()) return msg(409, "Ese cliente no puede recibir pedidos nuevos.");
        Pedido n = new Pedido();
        n.setCliente(c.get()); n.setProducto(p.get()); n.setCantidad(d.cantidad());
        n.setTotal(ReglasCompra.monto(p.get().getPrecio(), d.cantidad()));
        n.setEstado("PENDIENTE"); n.setFechaPedido(LocalDateTime.now());
        pedidos.save(n);
        return msg(201, "Pedido registrado.");
    }

    @PatchMapping("/pedidos/{id}/etapa")
    public ResponseEntity<?> avanzar(Authentication a, @PathVariable long id, @RequestBody Etapa d) {
        Optional<Long> yo = miId(a);
        if (yo.isEmpty()) return SIN_PERFIL;
        if (d == null || d.estado() == null) return msg(400, "Indica la etapa nueva.");
        List<String> actual = jdbc.query("SELECT ped.estado FROM pedido ped JOIN producto pr ON pr.id = ped.id_producto WHERE ped.id = ? AND pr.id_repostero = ?",
            (rs, i) -> rs.getString(1), id, yo.get());
        if (actual.isEmpty()) return msg(404, "Ese pedido no es de tus pasteles.");
        if (!ReglasEtapa.valida(actual.get(0), d.estado())) return msg(409, "No se puede pasar de " + actual.get(0) + " a " + d.estado() + ".");
        jdbc.update("UPDATE pedido SET estado = ? WHERE id = ? AND estado = ?", d.estado(), id, actual.get(0));
        return msg(200, "Pedido actualizado.");
    }
}

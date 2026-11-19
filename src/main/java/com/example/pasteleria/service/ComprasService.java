package com.example.pasteleria.service;

import com.example.pasteleria.model.Cliente;
import com.example.pasteleria.model.Pedido;
import com.example.pasteleria.model.Producto;
import com.example.pasteleria.repository.ClienteRepository;
import com.example.pasteleria.repository.PedidoRepository;
import com.example.pasteleria.repository.ProductoRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Cambios de estado de las transacciones. Los usan el flujo normal y el webhook, siempre de forma idempotente. */
@Service
public class ComprasService {
    private final JdbcTemplate jdbc;
    private final ClienteRepository clientes;
    private final ProductoRepository productos;
    private final PedidoRepository pedidos;

    public ComprasService(JdbcTemplate jdbc, ClienteRepository clientes, ProductoRepository productos, PedidoRepository pedidos) {
        this.jdbc = jdbc; this.clientes = clientes; this.productos = productos; this.pedidos = pedidos;
    }

    public Optional<Producto> producto(long id) { return productos.findById(id); }
    public Optional<Cliente> clienteDe(String username) { return clientes.findByUsuario(username); }

    public long crear(String username, Producto p, int cantidad, BigDecimal monto, String metodo) {
        var kh = new org.springframework.jdbc.support.GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO transaccion (username, producto_id, cantidad, monto, metodo_pago) VALUES (?,?,?,?,?)", Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, username); ps.setLong(2, p.getId()); ps.setInt(3, cantidad); ps.setBigDecimal(4, monto); ps.setString(5, metodo);
            return ps;
        }, kh);
        return ((Number) kh.getKeys().get("id")).longValue();
    }

    public void guardarOrden(long id, String ordenId) { jdbc.update("UPDATE transaccion SET paypal_order_id = ?, actualizada = now() WHERE id = ?", ordenId, id); }

    public Optional<Map<String, Object>> buscar(long id) {
        List<Map<String, Object>> f = jdbc.queryForList("SELECT * FROM transaccion WHERE id = ?", id);
        return f.isEmpty() ? Optional.empty() : Optional.of(f.get(0));
    }
    public Optional<Map<String, Object>> buscarPorOrden(String ordenId) {
        List<Map<String, Object>> f = jdbc.queryForList("SELECT * FROM transaccion WHERE paypal_order_id = ?", ordenId);
        return f.isEmpty() ? Optional.empty() : Optional.of(f.get(0));
    }

    /** PENDIENTE→PAGADA una sola vez (si ya estaba pagada no hace nada) y genera el pedido vinculado al cliente. */
    @Transactional
    public boolean confirmarPago(long id, String captureId) {
        int n = jdbc.update("UPDATE transaccion SET estado = 'PAGADA', paypal_capture_id = ?, actualizada = now() WHERE id = ? AND estado = 'PENDIENTE'", captureId, id);
        if (n == 0) return false;
        Map<String, Object> t = buscar(id).orElseThrow();
        Optional<Cliente> c = clienteDe((String) t.get("username"));
        if (c.isPresent() && !c.get().isCancelado() && !c.get().isOposicion()) {
            Pedido p = new Pedido();
            p.setCliente(c.get());
            p.setProducto(productos.findById(((Number) t.get("producto_id")).longValue()).orElseThrow());
            p.setCantidad(((Number) t.get("cantidad")).intValue());
            p.setTotal((BigDecimal) t.get("monto"));
            p.setEstado("PENDIENTE");
            p.setFechaPedido(LocalDateTime.now());
            jdbc.update("UPDATE transaccion SET pedido_id = ? WHERE id = ?", pedidos.save(p).getId(), id);
        }
        return true;
    }

    public boolean marcar(long id, String de, String a) {
        if (!ReglasCompra.transicionValida(de, a)) return false;
        return jdbc.update("UPDATE transaccion SET estado = ?, actualizada = now() WHERE id = ? AND estado = ?", a, id, de) == 1;
    }

    public List<Map<String, Object>> listar(String usernameONull) {
        String base = "SELECT t.id, t.username, p.nombre AS producto, t.cantidad, t.monto, t.moneda, t.estado, t.metodo_pago AS \"metodo\", t.pedido_id AS \"pedidoId\", t.creada FROM transaccion t JOIN producto p ON p.id = t.producto_id ";
        return usernameONull == null ? jdbc.queryForList(base + "ORDER BY t.id DESC LIMIT 300")
            : jdbc.queryForList(base + "WHERE t.username = ? ORDER BY t.id DESC LIMIT 300", usernameONull);
    }

    /** Registra el id del evento; false si ya se había procesado (PayPal reintenta webhooks). */
    public boolean registrarEvento(String eventoId) { return jdbc.update("INSERT INTO evento_webhook (id) VALUES (?) ON CONFLICT DO NOTHING", eventoId) == 1; }
}

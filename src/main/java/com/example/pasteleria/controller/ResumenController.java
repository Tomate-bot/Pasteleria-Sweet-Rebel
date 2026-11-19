package com.example.pasteleria.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/** Resumen del negocio para el inicio del administrador (solo ADMIN, por la regla /api/** de SecurityConfig). */
@RestController
@RequestMapping("/api/admin/resumen")
public class ResumenController {
    private final JdbcTemplate jdbc;
    public ResumenController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    public Map<String, Object> resumen() {
        Map<String, Object> r = new HashMap<>();
        r.put("ventas", jdbc.queryForObject("SELECT COALESCE(SUM(monto), 0) FROM transaccion WHERE estado = 'PAGADA'", java.math.BigDecimal.class));
        r.put("comprasPagadas", jdbc.queryForObject("SELECT COUNT(*) FROM transaccion WHERE estado = 'PAGADA'", Integer.class));
        r.put("clientes", jdbc.queryForObject("SELECT COUNT(*) FROM cliente WHERE NOT cancelado", Integer.class));
        r.put("productos", jdbc.queryForObject("SELECT COUNT(*) FROM producto", Integer.class));
        Map<String, Object> porEstado = new HashMap<>();
        jdbc.query("SELECT estado, COUNT(*) AS n FROM pedido GROUP BY estado", rs -> { porEstado.put(rs.getString(1), rs.getInt(2)); });
        r.put("pedidos", porEstado);
        r.put("recientes", jdbc.queryForList("SELECT t.id, t.username, p.nombre AS producto, t.monto, t.estado, t.creada FROM transaccion t JOIN producto p ON p.id = t.producto_id ORDER BY t.id DESC LIMIT 6"));
        return r;
    }
}

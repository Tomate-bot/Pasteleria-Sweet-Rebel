package com.example.pasteleria.controller;

import com.example.pasteleria.model.Cliente;
import com.example.pasteleria.model.Producto;
import com.example.pasteleria.service.ComprasService;
import com.example.pasteleria.service.PayPalService;
import com.example.pasteleria.service.PayPalService.PayPalException;
import com.example.pasteleria.service.ReglasCompra;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/compras")
public class ComprasController {
    private final ComprasService compras;
    private final PayPalService paypal;

    public ComprasController(ComprasService compras, PayPalService paypal) { this.compras = compras; this.paypal = paypal; }

    public record NuevaCompra(Long productoId, Integer cantidad, String metodo) {}
    public record Pago(Boolean simularRechazo) {}

    private static ResponseEntity<?> msg(int s, String m) { return ResponseEntity.status(s).body(Map.of("mensaje", m)); }
    private static boolean esAdmin(Authentication a) { return a.getAuthorities().stream().anyMatch(x -> x.getAuthority().equals("ROLE_ADMIN")); }

    @GetMapping("/config")
    public Map<String, Object> config() { return Map.of("modo", paypal.modo(), "simulado", paypal.simulado()); }

    @PostMapping
    public ResponseEntity<?> crear(Authentication auth, @RequestBody NuevaCompra d) {
        if (d == null || d.productoId() == null || d.cantidad() == null || !ReglasCompra.cantidadValida(d.cantidad()))
            return msg(400, "Elige un producto y una cantidad entre 1 y 1000.");
        String metodo = d.metodo() == null ? "PAYPAL" : d.metodo().toUpperCase();
        if (!ReglasCompra.metodoValido(metodo)) return msg(400, "Elige un método de pago válido.");
        // Stripe, Mercado Pago y OXXO son SIMULADOS: solo existen mientras PAYPAL_MODE=simulado (aquí se conectaría la pasarela real).
        if (!"PAYPAL".equals(metodo) && !paypal.simulado()) return msg(400, "Ese método de pago aún no está disponible.");
        Optional<Producto> p = compras.producto(d.productoId());
        if (p.isEmpty()) return msg(404, "Ese producto ya no existe.");
        Optional<Cliente> c = compras.clienteDe(auth.getName());
        if (c.isPresent() && (c.get().isCancelado() || c.get().isOposicion()))
            return msg(409, "Tu cuenta tiene cancelación u oposición registrada, por eso no puede comprar.");
        BigDecimal monto = ReglasCompra.monto(p.get().getPrecio(), d.cantidad());   // el servidor decide el precio
        long id = compras.crear(auth.getName(), p.get(), d.cantidad(), monto, metodo);
        try {
            PayPalService.Orden o = "PAYPAL".equals(metodo) ? paypal.crearOrden(monto, "MXN", id) : new PayPalService.Orden("SIM-" + java.util.UUID.randomUUID(), null);
            compras.guardarOrden(id, o.id());
            Map<String, Object> r = new HashMap<>();
            r.put("transaccionId", id); r.put("monto", monto); r.put("simulado", paypal.simulado()); r.put("aprobarUrl", o.aprobarUrl());
            return ResponseEntity.status(201).body(r);
        } catch (PayPalException e) {
            compras.marcar(id, "PENDIENTE", "FALLIDA");
            return msg(e.status == 422 ? 502 : e.status, e.getMessage());
        }
    }

    @PostMapping("/{id}/capturar")
    public ResponseEntity<?> capturar(Authentication auth, @PathVariable long id, @RequestBody(required = false) Pago d) {
        Optional<Map<String, Object>> t = compras.buscar(id);
        if (t.isEmpty() || (!esAdmin(auth) && !t.get().get("username").equals(auth.getName()))) return msg(404, "No encontramos esa compra.");
        if (!"PENDIENTE".equals(t.get().get("estado"))) return msg(409, "Esta compra ya fue procesada (" + t.get().get("estado") + ").");
        try {
            String orden = (String) t.get().get("paypal_order_id");
            boolean rechazo = d != null && Boolean.TRUE.equals(d.simularRechazo());
            PayPalService.Captura c = orden.startsWith("SIM-") ? new PayPalService.Captura(!rechazo, rechazo ? null : "SIMCAP-" + java.util.UUID.randomUUID()) : paypal.capturar(orden, false);
            if (!c.ok()) {
                compras.marcar(id, "PENDIENTE", "FALLIDA");
                return msg(402, "El pago fue rechazado y no se hizo ningún cobro. Puedes intentar de nuevo con otro método.");
            }
            compras.confirmarPago(id, c.captureId());
            return msg(200, "¡Pago recibido! Tu compra quedó registrada.");
        } catch (PayPalException e) {
            return msg(e.status == 422 ? 502 : e.status, e.getMessage());    // el estado sigue PENDIENTE: se puede reintentar
        }
    }

    @GetMapping("/mias")
    public Object mias(Authentication auth) { return compras.listar(auth.getName()); }

    @GetMapping
    public ResponseEntity<?> todas(Authentication auth) {
        return esAdmin(auth) ? ResponseEntity.ok(compras.listar(null)) : msg(403, "Solo administración puede ver todas las compras.");
    }

    @PostMapping("/{id}/reembolsar")
    public ResponseEntity<?> reembolsar(Authentication auth, @PathVariable long id) {
        if (!esAdmin(auth)) return msg(403, "Solo administración puede reembolsar.");
        Optional<Map<String, Object>> t = compras.buscar(id);
        if (t.isEmpty()) return msg(404, "No encontramos esa compra.");
        if (!"PAGADA".equals(t.get().get("estado"))) return msg(409, "Solo se pueden reembolsar compras pagadas.");
        try {
            String cap = (String) t.get().get("paypal_capture_id");
            if (!(cap != null && (cap.startsWith("SIMCAP-") || paypal.reembolsar(cap)))) return msg(502, "PayPal no completó el reembolso. Intenta más tarde.");
        } catch (PayPalException e) { return msg(e.status == 422 ? 502 : e.status, e.getMessage()); }
        compras.marcar(id, "PAGADA", "REEMBOLSADA");
        return msg(200, "Reembolso registrado.");
    }
}

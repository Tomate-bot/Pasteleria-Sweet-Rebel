package com.example.pasteleria.controller;

import com.example.pasteleria.service.ComprasService;
import com.example.pasteleria.service.PayPalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/** PayPal avisa aquí cuando un pago se completa, se rechaza o se reembolsa. La firma se verifica con PayPal. */
@RestController
public class PayPalWebhookController {
    private final PayPalService paypal;
    private final ComprasService compras;
    public PayPalWebhookController(PayPalService paypal, ComprasService compras) { this.paypal = paypal; this.compras = compras; }

    @SuppressWarnings("unchecked")
    @PostMapping("/api/paypal/webhook")
    public ResponseEntity<?> recibir(@RequestHeader Map<String, String> cabeceras, @RequestBody Map<String, Object> evento) {
        Map<String, String> h = new HashMap<>();
        cabeceras.forEach((k, v) -> h.put(k.toLowerCase(), v));
        if (!paypal.webhookAutentico(h, evento)) return ResponseEntity.status(401).body(Map.of("mensaje", "Firma no válida."));
        String id = String.valueOf(evento.get("id"));
        if (!compras.registrarEvento(id)) return ResponseEntity.ok(Map.of("mensaje", "Evento ya procesado."));
        String tipo = String.valueOf(evento.get("event_type"));
        Map<String, Object> recurso = (Map<String, Object>) evento.getOrDefault("resource", Map.of());
        Map<String, Object> sup = (Map<String, Object>) recurso.getOrDefault("supplementary_data", Map.of());
        Map<String, Object> rel = (Map<String, Object>) sup.getOrDefault("related_ids", Map.of());
        compras.buscarPorOrden(String.valueOf(rel.get("order_id"))).ifPresent(t -> {
            long tx = ((Number) t.get("id")).longValue();
            switch (tipo) {
                case "PAYMENT.CAPTURE.COMPLETED" -> compras.confirmarPago(tx, String.valueOf(recurso.get("id")));
                case "PAYMENT.CAPTURE.DENIED" -> compras.marcar(tx, "PENDIENTE", "FALLIDA");
                case "PAYMENT.CAPTURE.REFUNDED" -> compras.marcar(tx, "PAGADA", "REEMBOLSADA");
                default -> { }
            }
        });
        return ResponseEntity.ok(Map.of("mensaje", "Recibido."));
    }
}

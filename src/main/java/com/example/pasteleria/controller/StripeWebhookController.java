package com.example.pasteleria.controller;

import com.example.pasteleria.service.ComprasService;
import com.example.pasteleria.service.StripeService;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StripeWebhookController {
    private final StripeService stripe;
    private final ComprasService compras;
    private final ObjectMapper json;

    public StripeWebhookController(StripeService stripe, ComprasService compras, ObjectMapper json) {
        this.stripe = stripe;
        this.compras = compras;
        this.json = json;
    }

    @PostMapping("/api/stripe/webhook")
    @Transactional
    public ResponseEntity<?> recibir(@RequestHeader(value = "Stripe-Signature", required = false) String firma,
                                     @RequestBody String payload) {
        if (!stripe.firmaWebhookValida(payload, firma))
            return ResponseEntity.status(401).body(Map.of("mensaje", "Firma de Stripe no válida."));
        JsonNode evento;
        try {
            evento = json.readTree(payload);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "El evento de Stripe no tiene un formato válido."));
        }
        String tipo = evento.path("type").asText("");
        if (!tipo.equals("checkout.session.completed")
                && !tipo.equals("checkout.session.async_payment_succeeded")
                && !tipo.equals("checkout.session.async_payment_failed"))
            return ResponseEntity.ok(Map.of("mensaje", "Evento no relacionado con la confirmación de compras."));

        JsonNode sesionJson = evento.path("data").path("object");
        long transaccionId;
        try {
            transaccionId = Long.parseLong(sesionJson.path("client_reference_id").asText());
        } catch (NumberFormatException e) {
            return ResponseEntity.ok(Map.of("mensaje", "Evento sin referencia de compra de Sweet Rebel."));
        }
        var registro = compras.buscar(transaccionId);
        if (registro.isEmpty()) return ResponseEntity.ok(Map.of("mensaje", "Compra no encontrada; evento ignorado."));

        Map<String, Object> sesion = json.convertValue(sesionJson, new TypeReference<>() {});
        Map<String, Object> transaccion = registro.get();
        String metodo = String.valueOf(transaccion.get("metodo_pago"));
        String sessionId = String.valueOf(transaccion.get("paypal_order_id"));
        BigDecimal monto = (BigDecimal) transaccion.get("monto");
        if ((!metodo.equals("STRIPE") && !metodo.equals("OXXO"))
                || !stripe.datosWebhookCoinciden(sesion, sessionId, transaccionId, monto, metodo))
            return ResponseEntity.badRequest().body(Map.of("mensaje", "El evento no coincide con la compra."));

        String eventId = evento.path("id").asText("");
        if (eventId.isBlank()) return ResponseEntity.badRequest().body(Map.of("mensaje", "El evento no tiene identificador."));
        String paymentIntentId = sesionJson.path("payment_intent").isTextual()
            ? sesionJson.path("payment_intent").asText()
            : sesionJson.path("payment_intent").path("id").asText("");
        boolean pagoConfirmado = "paid".equals(sesionJson.path("payment_status").asText());
        if (pagoConfirmado && paymentIntentId.isBlank())
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Stripe no incluyó el identificador de pago."));
        if (!compras.registrarEvento(eventId)) return ResponseEntity.ok(Map.of("mensaje", "Evento ya procesado."));

        if (tipo.equals("checkout.session.async_payment_failed")) compras.marcar(transaccionId, "PENDIENTE", "FALLIDA");
        else if (pagoConfirmado) compras.confirmarPago(transaccionId, paymentIntentId);
        return ResponseEntity.ok(Map.of("mensaje", "Evento de Stripe procesado."));
    }
}

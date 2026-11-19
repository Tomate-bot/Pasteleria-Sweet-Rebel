package com.example.pasteleria.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Pasarela PayPal (API v2). Modos: simulado (por defecto, sin credenciales ni dinero), sandbox y live.
 * Las credenciales salen SOLO de variables de entorno.
 */
@Service
public class PayPalService {
    public record Orden(String id, String aprobarUrl) {}
    public record Captura(boolean ok, String captureId) {}
    public static class PayPalException extends RuntimeException {
        public final int status;
        public PayPalException(int status, String mensaje) { super(mensaje); this.status = status; }
    }
    private static final ParameterizedTypeReference<Map<String, Object>> MAPA = new ParameterizedTypeReference<>() {};
    private final String modo, clientId, secreto, webhookId, appUrl;
    private final RestClient http;

    public PayPalService(@Value("${paypal.mode:simulado}") String modo, @Value("${paypal.client-id:}") String clientId,
                         @Value("${paypal.client-secret:}") String secreto, @Value("${paypal.webhook-id:}") String webhookId,
                         @Value("${paypal.app-url:http://localhost:5173}") String appUrl) {
        this.modo = modo; this.clientId = clientId; this.secreto = secreto; this.webhookId = webhookId; this.appUrl = appUrl;
        if (!simulado() && (clientId.isBlank() || secreto.isBlank()))
            throw new IllegalStateException("PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET son obligatorios si PAYPAL_MODE no es 'simulado'.");
        JdkClientHttpRequestFactory f = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build());
        f.setReadTimeout(Duration.ofSeconds(15));
        this.http = RestClient.builder().baseUrl("live".equals(modo) ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com").requestFactory(f).build();
    }

    public boolean simulado() { return "simulado".equals(modo); }
    public String modo() { return modo; }

    public Orden crearOrden(BigDecimal monto, String moneda, long transaccionId) {
        if (simulado()) return new Orden("SIM-" + UUID.randomUUID(), null);
        Map<String, Object> cuerpo = Map.of("intent", "CAPTURE",
            "purchase_units", List.of(Map.of("reference_id", "TX-" + transaccionId,
                "amount", Map.of("currency_code", moneda, "value", monto.toPlainString()))),
            "payment_source", Map.of("paypal", Map.of("experience_context", Map.of("user_action", "PAY_NOW",
                "return_url", appUrl + "/?pago=ok&tx=" + transaccionId, "cancel_url", appUrl + "/?pago=cancelado&tx=" + transaccionId))));
        Map<String, Object> r = seguro(() -> http.post().uri("/v2/checkout/orders").headers(h -> h.setBearerAuth(token()))
            .contentType(MediaType.APPLICATION_JSON).body(cuerpo).retrieve().body(MAPA));
        String url = null;
        for (Object l : (List<?>) r.getOrDefault("links", List.of())) {
            Map<?, ?> m = (Map<?, ?>) l;
            if ("payer-action".equals(m.get("rel")) || "approve".equals(m.get("rel"))) url = (String) m.get("href");
        }
        return new Orden((String) r.get("id"), url);
    }

    /** Un pago rechazado (422) no es un error del sistema: devuelve ok=false. */
    public Captura capturar(String ordenId, boolean simularRechazo) {
        if (simulado()) return simularRechazo ? new Captura(false, null) : new Captura(true, "SIMCAP-" + UUID.randomUUID());
        try {
            Map<String, Object> r = seguro(() -> http.post().uri("/v2/checkout/orders/{id}/capture", ordenId)
                .headers(h -> h.setBearerAuth(token())).contentType(MediaType.APPLICATION_JSON).body(Map.of()).retrieve().body(MAPA));
            return "COMPLETED".equals(r.get("status")) ? new Captura(true, idCaptura(r)) : new Captura(false, null);
        } catch (PayPalException e) {
            if (e.status == 422) return new Captura(false, null);
            throw e;
        }
    }

    public boolean reembolsar(String captureId) {
        if (simulado()) return true;
        Map<String, Object> r = seguro(() -> http.post().uri("/v2/payments/captures/{id}/refund", captureId)
            .headers(h -> h.setBearerAuth(token())).contentType(MediaType.APPLICATION_JSON).body(Map.of()).retrieve().body(MAPA));
        return "COMPLETED".equals(r.get("status")) || "PENDING".equals(r.get("status"));
    }

    /** En modo simulado no se aceptan webhooks (nadie debe poder falsificar un pago). */
    public boolean webhookAutentico(Map<String, String> cabeceras, Map<String, Object> evento) {
        if (simulado() || webhookId.isBlank()) return false;
        try {
            Map<String, Object> r = seguro(() -> http.post().uri("/v1/notifications/verify-webhook-signature")
                .headers(h -> h.setBearerAuth(token())).contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("auth_algo", cabeceras.getOrDefault("paypal-auth-algo", ""), "cert_url", cabeceras.getOrDefault("paypal-cert-url", ""),
                    "transmission_id", cabeceras.getOrDefault("paypal-transmission-id", ""), "transmission_sig", cabeceras.getOrDefault("paypal-transmission-sig", ""),
                    "transmission_time", cabeceras.getOrDefault("paypal-transmission-time", ""), "webhook_id", webhookId, "webhook_event", evento))
                .retrieve().body(MAPA));
            return "SUCCESS".equals(r.get("verification_status"));
        } catch (PayPalException e) { return false; }
    }

    private String token() {
        LinkedMultiValueMap<String, String> f = new LinkedMultiValueMap<>(); f.add("grant_type", "client_credentials");
        Map<String, Object> r = http.post().uri("/v1/oauth2/token").headers(h -> h.setBasicAuth(clientId, secreto))
            .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(f).retrieve().body(MAPA);
        return (String) r.get("access_token");
    }

    @SuppressWarnings("unchecked")
    private static String idCaptura(Map<String, Object> r) {
        try {
            Map<String, Object> u = ((List<Map<String, Object>>) r.get("purchase_units")).get(0);
            return (String) ((List<Map<String, Object>>) ((Map<String, Object>) u.get("payments")).get("captures")).get(0).get("id");
        } catch (RuntimeException e) { return null; }
    }

    private <T> T seguro(Supplier<T> op) {
        try { return op.get(); }
        catch (ResourceAccessException e) { throw new PayPalException(502, "No se pudo comunicar con PayPal. Revisa tu conexión e intenta de nuevo."); }
        catch (RestClientResponseException e) {
            throw new PayPalException(e.getStatusCode().value() == 422 ? 422 : 502, "PayPal no pudo procesar la operación (código " + e.getStatusCode().value() + ").");
        }
    }
}

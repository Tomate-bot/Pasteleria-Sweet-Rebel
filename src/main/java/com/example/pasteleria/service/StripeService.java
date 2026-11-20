package com.example.pasteleria.service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
public class StripeService {
    public record Checkout(String id, String url) {}
    public record EstadoSesion(String estadoPago, String estadoSesion, boolean coincide, String paymentIntentId) {}

    private static final ParameterizedTypeReference<Map<String, Object>> MAPA = new ParameterizedTypeReference<>() {};
    private final String secretKey;
    private final String webhookSecret;
    private final String appUrl;
    private final RestClient http;

    public StripeService(@Value("${stripe.secret-key:}") String secretKey,
                         @Value("${stripe.webhook-secret:}") String webhookSecret,
                         @Value("${paypal.app-url:http://localhost:5173}") String appUrl) {
        this.secretKey = secretKey;
        this.webhookSecret = webhookSecret;
        this.appUrl = appUrl.replaceAll("/$", "");
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build());
        factory.setReadTimeout(Duration.ofSeconds(15));
        this.http = RestClient.builder().baseUrl("https://api.stripe.com").requestFactory(factory).build();
    }

    public boolean configurado() { return !secretKey.isBlank(); }
    public boolean webhookConfigurado() { return !webhookSecret.isBlank(); }
    public boolean oxxoConfigurado() { return configurado() && webhookConfigurado(); }

    public Checkout crearCheckout(long transaccionId, String producto, int cantidad, BigDecimal monto, String metodo) {
        exigirConfiguracion();
        LinkedMultiValueMap<String, String> form = formularioCheckout(transaccionId, producto, cantidad, monto, metodo, appUrl);
        try {
            Map<String, Object> respuesta = seguro(() -> http.post().uri("/v1/checkout/sessions")
                .headers(h -> h.setBasicAuth(secretKey, ""))
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form).retrieve().body(MAPA));
            if (respuesta == null || respuesta.get("id") == null)
                throw new IllegalStateException("Stripe no devolvió una sesión de pago.");
            String url = respuesta.get("url") instanceof String valor ? valor : "";
            URI destino;
            try {
                destino = URI.create(url);
            } catch (IllegalArgumentException e) {
                throw new IllegalStateException("Stripe devolvió una dirección de pago no válida.", e);
            }
            if (!"https".equals(destino.getScheme()) || !"checkout.stripe.com".equalsIgnoreCase(destino.getHost()))
                throw new IllegalStateException("Stripe devolvió una dirección de pago no válida.");
            return new Checkout(respuesta.get("id").toString(), url);
        } catch (RestClientResponseException e) {
            throw new IllegalStateException(mensajeErrorStripe(e), e);
        } catch (ResourceAccessException e) {
            throw new IllegalStateException("No se pudo conectar con Stripe. No se confirmó ningún pago.", e);
        }
    }

    static LinkedMultiValueMap<String, String> formularioCheckout(long transaccionId, String producto, int cantidad,
                                                                   BigDecimal monto, String metodo, String appUrl) {
        long centavos;
        try {
            centavos = monto.movePointRight(2).longValueExact();
        } catch (ArithmeticException e) {
            throw new IllegalArgumentException("El importe de la compra no es válido para Stripe.", e);
        }
        String tipoPago = "OXXO".equals(metodo) ? "oxxo" : "card";
        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("mode", "payment");
        form.add("allowed_payment_method_types[0]", tipoPago);
        form.add("line_items[0][price_data][currency]", "mxn");
        form.add("line_items[0][price_data][product_data][name]", producto);
        form.add("line_items[0][price_data][unit_amount]", Long.toString(centavos));
        form.add("line_items[0][quantity]", Integer.toString(cantidad));
        form.add("client_reference_id", Long.toString(transaccionId));
        form.add("metadata[transaccion_id]", Long.toString(transaccionId));
        form.add("success_url", appUrl + "/?pago=stripe&session_id={CHECKOUT_SESSION_ID}&tx=" + transaccionId);
        form.add("cancel_url", appUrl + "/?pago=cancelado&tx=" + transaccionId);
        if ("OXXO".equals(metodo)) form.add("payment_method_options[oxxo][expires_after_days]", "5");
        return form;
    }

    public EstadoSesion verificarCheckout(String sessionId, String sessionIdGuardado, long transaccionId,
                                          BigDecimal monto, String metodo) {
        exigirConfiguracion();
        validarSessionId(sessionId);
        if (!sessionId.equals(sessionIdGuardado))
            throw new IllegalArgumentException("La sesión de Stripe no corresponde a esta compra.");
        try {
            Map<String, Object> sesion = seguro(() -> http.get()
                .uri(builder -> builder.path("/v1/checkout/sessions/{id}")
                    .queryParam("expand[]", "payment_intent").build(sessionId))
                .headers(h -> h.setBasicAuth(secretKey, ""))
                .retrieve().body(MAPA));
            if (sesion == null) throw new IllegalStateException("Stripe no devolvió el estado de la compra.");
            String estadoPago = String.valueOf(sesion.getOrDefault("payment_status", "unknown"));
            String estadoSesion = String.valueOf(sesion.getOrDefault("status", "unknown"));
            boolean coincide = Long.toString(transaccionId).equals(String.valueOf(sesion.get("client_reference_id")))
                && Long.toString(transaccionId).equals(metadataTransactionId(sesion))
                && monto.movePointRight(2).compareTo(new BigDecimal(String.valueOf(sesion.get("amount_total")))) == 0
                && "mxn".equals(sesion.get("currency"))
                && tieneMetodo(sesion, metodo);
            return new EstadoSesion(estadoPago, estadoSesion, coincide, paymentIntentId(sesion.get("payment_intent")));
        } catch (RestClientResponseException e) {
            throw new IllegalStateException("Stripe no pudo consultar el pago (HTTP " + e.getStatusCode().value() + ").", e);
        } catch (ResourceAccessException e) {
            throw new IllegalStateException("No se pudo conectar con Stripe para confirmar el pago.", e);
        } catch (NumberFormatException e) {
            throw new IllegalStateException("Stripe devolvió un importe no válido.", e);
        }
    }

    public boolean firmaWebhookValida(String payload, String firma) {
        if (webhookSecret.isBlank() || payload == null || firma == null) return false;
        String timestamp = null;
        java.util.ArrayList<String> firmas = new java.util.ArrayList<>();
        for (String parte : firma.split(",")) {
            String[] par = parte.trim().split("=", 2);
            if (par.length != 2) continue;
            if ("t".equals(par[0])) timestamp = par[1];
            if ("v1".equals(par[0])) firmas.add(par[1]);
        }
        if (timestamp == null || firmas.isEmpty()) return false;
        long segundos;
        try { segundos = Long.parseLong(timestamp); }
        catch (NumberFormatException e) { return false; }
        long ahora = System.currentTimeMillis() / 1000;
        if (segundos < ahora - 300 || segundos > ahora + 300) return false;
        byte[] esperado;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            esperado = mac.doFinal((timestamp + "." + payload).getBytes(StandardCharsets.UTF_8));
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("No se pudo validar la firma del webhook de Stripe.", e);
        }
        for (String candidata : firmas) {
            try {
                if (MessageDigest.isEqual(esperado, HexFormat.of().parseHex(candidata))) return true;
            } catch (IllegalArgumentException ignored) {
                // Stripe may include multiple v1 signatures during key rotation.
            }
        }
        return false;
    }

    public boolean datosWebhookCoinciden(Map<String, Object> sesion, String sessionIdGuardado,
                                          long transaccionId, BigDecimal monto, String metodo) {
        try {
            return sessionIdGuardado != null && sessionIdGuardado.equals(sesion.get("id"))
                && Long.toString(transaccionId).equals(String.valueOf(sesion.get("client_reference_id")))
                && Long.toString(transaccionId).equals(metadataTransactionId(sesion))
                && monto.movePointRight(2).compareTo(new BigDecimal(String.valueOf(sesion.get("amount_total")))) == 0
                && "mxn".equals(sesion.get("currency"))
                && tieneMetodo(sesion, metodo);
        } catch (NumberFormatException e) {
            return false;
        }
    }

    public boolean reembolsar(String paymentIntentId) {
        exigirConfiguracion();
        if (paymentIntentId == null || !paymentIntentId.matches("pi_[A-Za-z0-9]{10,100}"))
            throw new IllegalArgumentException("El identificador del pago de Stripe no es válido.");
        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("payment_intent", paymentIntentId);
        try {
            Map<String, Object> respuesta = seguro(() -> http.post().uri("/v1/refunds")
                .headers(h -> {
                    h.setBasicAuth(secretKey, "");
                    h.set("Idempotency-Key", "refund-" + paymentIntentId);
                })
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form).retrieve().body(MAPA));
            return respuesta != null && "succeeded".equals(respuesta.get("status"));
        } catch (RestClientResponseException e) {
            throw new IllegalStateException("Stripe no pudo procesar el reembolso (HTTP " + e.getStatusCode().value() + ").", e);
        } catch (ResourceAccessException e) {
            throw new IllegalStateException("No se pudo conectar con Stripe para reembolsar.", e);
        }
    }

    private <T> T seguro(Supplier<T> operacion) {
        try { return operacion.get(); }
        catch (RestClientResponseException e) {
            throw new IllegalStateException(mensajeErrorStripe(e), e);
        } catch (ResourceAccessException e) {
            throw new IllegalStateException("No se pudo conectar con Stripe.", e);
        }
    }

    static String mensajeErrorStripe(RestClientResponseException e) {
        String base = "Stripe no pudo completar la operación (HTTP " + e.getStatusCode().value() + ")";
        String cuerpo = e.getResponseBodyAsString();
        Matcher mensaje = Pattern.compile("\"message\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"")
            .matcher(cuerpo == null ? "" : cuerpo);
        if (!mensaje.find()) return base + ".";
        String detalle = mensaje.group(1).replace("\\n", " ").replace("\\r", " ").replace("\\\"", "\"");
        if (detalle.length() > 240) detalle = detalle.substring(0, 240) + "…";
        return base + ": " + detalle;
    }

    private static void validarSessionId(String id) {
        if (id == null || !id.matches("cs_(test|live)_[A-Za-z0-9]{10,120}"))
            throw new IllegalArgumentException("El identificador de Checkout de Stripe no es válido.");
    }

    private static String metadataTransactionId(Map<String, Object> sesion) {
        Object metadata = sesion.get("metadata");
        return metadata instanceof Map<?, ?> mapa ? String.valueOf(mapa.get("transaccion_id")) : "";
    }

    private static boolean tieneMetodo(Map<String, Object> sesion, String metodo) {
        Object metodos = sesion.get("payment_method_types");
        String esperado = "OXXO".equals(metodo) ? "oxxo" : "card";
        return metodos instanceof List<?> lista && lista.contains(esperado);
    }

    private static String paymentIntentId(Object valor) {
        if (valor instanceof String id) return id;
        if (valor instanceof Map<?, ?> mapa && mapa.get("id") instanceof String id) return id;
        return null;
    }

    private void exigirConfiguracion() {
        if (!configurado()) throw new IllegalStateException("Configura STRIPE_SECRET_KEY en el backend.");
    }
}

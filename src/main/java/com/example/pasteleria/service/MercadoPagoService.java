package com.example.pasteleria.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.nio.charset.StandardCharsets;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;

@Service
public class MercadoPagoService {
    public record Preferencia(String id, String url) {}
    public record EstadoPago(String estado, boolean coincide) {}

    private static final ParameterizedTypeReference<Map<String, Object>> MAPA = new ParameterizedTypeReference<>() {};
    private static final ObjectMapper JSON = JsonMapper.builder().build();
    private final String accessToken;
    private final String appUrl;
    private final RestClient http;

    public MercadoPagoService(@Value("${mercadopago.access-token:}") String accessToken,
                              @Value("${paypal.app-url:http://localhost:5173}") String appUrl) {
        this.accessToken = accessToken;
        this.appUrl = appUrl.replaceAll("/$", "");
        this.http = RestClient.builder()
            .baseUrl("https://api.mercadopago.com")
            .defaultHeader("Authorization", "Bearer " + accessToken)
            .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
            .build();
    }

    public boolean configurado() { return !accessToken.isBlank(); }

    public Preferencia crearPreferencia(long transaccionId, String producto, int cantidad, BigDecimal monto) {
        exigirConfiguracion();
        Map<String, Object> cuerpo = cuerpoPreferencia(transaccionId, producto, cantidad, monto, appUrl);
        try {
            Map<String, Object> respuesta = http.post().uri("/checkout/preferences")
                .contentType(MediaType.APPLICATION_JSON).body(cuerpo).retrieve().body(MAPA);
            String url = (String) respuesta.getOrDefault("sandbox_init_point", respuesta.get("init_point"));
            if (respuesta.get("id") == null || url == null || url.isBlank())
                throw new IllegalStateException("Mercado Pago no devolvió una URL de pago.");
            return new Preferencia(respuesta.get("id").toString(), url);
        } catch (RestClientResponseException e) {
            throw new IllegalStateException(mensajeErrorProveedor("crear la preferencia", e), e);
        } catch (ResourceAccessException e) {
            throw new IllegalStateException("No se pudo conectar con Mercado Pago. La compra sigue pendiente.", e);
        }
    }

    static Map<String, Object> cuerpoPreferencia(long transaccionId, String producto, int cantidad,
                                                  BigDecimal monto, String urlBase) {
        String base = urlBase.replaceAll("/$", "");
        Map<String, Object> cuerpo = new HashMap<>(Map.of(
            "items", List.of(Map.of(
                "id", "TX-" + transaccionId,
                "title", producto,
                "quantity", cantidad,
                "currency_id", "MXN",
                "unit_price", monto
            )),
            "external_reference", Long.toString(transaccionId),
            "back_urls", Map.of(
                "success", base + "/?pago=mercadopago&tx=" + transaccionId,
                "failure", base + "/?pago=fallido&tx=" + transaccionId,
                "pending", base + "/?pago=pendiente&tx=" + transaccionId
            )
        ));
        if (base.toLowerCase(Locale.ROOT).startsWith("https://"))
            cuerpo.put("auto_return", "approved");
        return cuerpo;
    }

    public EstadoPago verificarPago(String paymentId, long transaccionId, BigDecimal monto) {
        exigirConfiguracion();
        if (paymentId == null || !paymentId.matches("[0-9]{1,30}"))
            throw new IllegalArgumentException("El identificador del pago de Mercado Pago no es válido.");
        try {
            Map<String, Object> pago = http.get().uri("/v1/payments/{id}", paymentId).retrieve().body(MAPA);
            String estado = String.valueOf(pago.getOrDefault("status", "unknown"));
            Object importe = pago.get("transaction_amount");
            Object referencia = pago.get("external_reference");
            Object moneda = pago.get("currency_id");
            boolean coincide = Long.toString(transaccionId).equals(String.valueOf(referencia))
                && importe != null && new BigDecimal(importe.toString()).compareTo(monto) == 0
                && "MXN".equals(moneda);
            return new EstadoPago(estado, coincide);
        } catch (RestClientResponseException e) {
            throw new IllegalStateException(mensajeErrorProveedor("consultar el pago", e), e);
        } catch (ResourceAccessException e) {
            throw new IllegalStateException("No se pudo conectar con Mercado Pago para confirmar el pago.", e);
        }
    }

    public boolean reembolsar(String paymentId) {
        exigirConfiguracion();
        if (paymentId == null || !paymentId.matches("[0-9]{1,30}"))
            throw new IllegalArgumentException("El identificador del pago de Mercado Pago no es válido.");
        try {
            Map<String, Object> respuesta = http.post().uri("/v1/payments/{id}/refund", paymentId)
                .contentType(MediaType.APPLICATION_JSON).body(Map.of()).retrieve().body(MAPA);
            return "approved".equals(respuesta.get("status"));
        } catch (RestClientResponseException e) {
            throw new IllegalStateException(mensajeErrorProveedor("completar el reembolso", e), e);
        } catch (ResourceAccessException e) {
            throw new IllegalStateException("No se pudo conectar con Mercado Pago para reembolsar.", e);
        }
    }

    private void exigirConfiguracion() {
        if (!configurado()) throw new IllegalStateException("Configura MERCADOPAGO_ACCESS_TOKEN en el backend.");
    }

    private static String mensajeErrorProveedor(String accion, RestClientResponseException e) {
        String detalle = detalleErrorProveedor(e.getResponseBodyAsString(StandardCharsets.UTF_8));
        String mensaje = "Mercado Pago no pudo " + accion + " (HTTP " + e.getStatusCode().value() + ")";
        return detalle.isBlank() ? mensaje + "." : mensaje + ": " + detalle;
    }

    static String detalleErrorProveedor(String cuerpo) {
        if (cuerpo == null || cuerpo.isBlank()) return "";

        try {
            JsonNode error = JSON.readTree(cuerpo);
            List<String> detalles = new ArrayList<>();
            agregarTexto(detalles, error.path("message"));
            JsonNode causas = error.path("cause");
            if (causas.isArray()) {
                for (JsonNode causa : causas) {
                    agregarTexto(detalles, causa.path("description"));
                }
            }
            String detalle = String.join("; ", detalles).replaceAll("\\s+", " ").trim();
            if (detalle.length() > 400) return detalle.substring(0, 397) + "...";
            return detalle;
        } catch (JacksonException e) {
            return "Mercado Pago devolvió una respuesta de error con formato no reconocido.";
        }
    }

    private static void agregarTexto(List<String> detalles, JsonNode valor) {
        if (valor.isTextual() && !valor.asText().isBlank()) detalles.add(valor.asText());
    }
}

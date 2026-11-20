package com.example.pasteleria.service;

import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StripeServiceTest {
    private static final String SECRET = "whsec-test-secret";
    private final StripeService stripe = new StripeService("sk_test_key", SECRET, "http://localhost:5173");

    @Test
    void aceptaUnaFirmaValidaAunqueHayaOtraFirmaV1Malformada() throws Exception {
        String payload = "{\"type\":\"checkout.session.completed\"}";
        String timestamp = Long.toString(System.currentTimeMillis() / 1000);
        String firmaValida = firmar(timestamp + "." + payload);

        assertTrue(stripe.firmaWebhookValida(payload,
            "t=" + timestamp + ",v1=not-hex,v1=" + firmaValida));
    }

    @Test
    void rechazaFirmasFueraDeLaVentanaDeTiempo() throws Exception {
        String payload = "{}";
        String timestamp = Long.toString(System.currentTimeMillis() / 1000 - 301);

        assertFalse(stripe.firmaWebhookValida(payload,
            "t=" + timestamp + ",v1=" + firmar(timestamp + "." + payload)));
    }

    @Test
    void muestraElMotivoQueStripeDevuelveEnUnaRespuestaDeError() {
        var error = HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "Bad Request", HttpHeaders.EMPTY,
            "{\"error\":{\"message\":\"This account cannot accept this payment method.\"}}".getBytes(StandardCharsets.UTF_8),
            StandardCharsets.UTF_8);

        assertTrue(StripeService.mensajeErrorStripe(error).contains("This account cannot accept this payment method."));
    }

    @Test
    void creaCheckoutDeTarjetaConFiltroDeMetodosDinamicosDeStripe() {
        var form = StripeService.formularioCheckout(42, "Pastel", 2, new BigDecimal("125.50"), "STRIPE", "https://sweetrebel.test");

        assertEquals("card", form.getFirst("allowed_payment_method_types[0]"));
        assertTrue(form.getFirst("payment_method_types[0]") == null);
        assertEquals("12550", form.getFirst("line_items[0][price_data][unit_amount]"));
        assertEquals("2", form.getFirst("line_items[0][quantity]"));
    }

    @Test
    void creaCheckoutOxxoConFiltroDinamicoYVencimientoDelVale() {
        var form = StripeService.formularioCheckout(43, "Galletas", 1, new BigDecimal("79.00"), "OXXO", "https://sweetrebel.test");

        assertEquals("oxxo", form.getFirst("allowed_payment_method_types[0]"));
        assertEquals("5", form.getFirst("payment_method_options[oxxo][expires_after_days]"));
        assertTrue(form.getFirst("payment_method_types[0]") == null);
    }

    private static String firmar(String contenido) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(contenido.getBytes(StandardCharsets.UTF_8)));
    }
}

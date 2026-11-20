package com.example.pasteleria.controller;

import com.example.pasteleria.service.ComprasService;
import com.example.pasteleria.service.MercadoPagoService;
import com.example.pasteleria.service.PayPalService;
import com.example.pasteleria.service.StripeService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

class ComprasControllerTest {
    private ComprasController controlador(ComprasService compras) {
        return new ComprasController(
            compras,
            new PayPalService("simulado", "", "", "", "http://localhost:5173"),
            new MercadoPagoService("", "http://localhost:5173"),
            new StripeService("", "", "http://localhost:5173")
        );
    }

    @Test
    void noOfrecePasarelasSimuladasNiPendientesDeIntegracion() {
        ComprasController controller = controlador(mock(ComprasService.class));
        Map<?, ?> paypal = (Map<?, ?>) controller.config().get("paypal");
        Map<?, ?> mercadoPago = (Map<?, ?>) controller.config().get("mercadopago");
        Map<?, ?> stripe = (Map<?, ?>) controller.config().get("stripe");
        Map<?, ?> oxxo = (Map<?, ?>) controller.config().get("oxxo");

        assertFalse((Boolean) paypal.get("disponible"));
        assertFalse((Boolean) mercadoPago.get("disponible"));
        assertFalse((Boolean) stripe.get("disponible"));
        assertFalse((Boolean) oxxo.get("disponible"));
    }

    @Test
    void oxxoRequiereClaveDeWebhookAunqueStripeTarjetaEsteConfigurado() {
        ComprasController controller = new ComprasController(
            mock(ComprasService.class),
            new PayPalService("simulado", "", "", "", "http://localhost:5173"),
            new MercadoPagoService("", "http://localhost:5173"),
            new StripeService("sk_test_example", "", "http://localhost:5173")
        );
        Map<?, ?> stripe = (Map<?, ?>) controller.config().get("stripe");
        Map<?, ?> oxxo = (Map<?, ?>) controller.config().get("oxxo");

        assertTrue((Boolean) stripe.get("disponible"));
        assertFalse((Boolean) oxxo.get("disponible"));
    }

    @Test
    void noCreaComprasConUnaPasarelaNoConfigurada() {
        ComprasService compras = mock(ComprasService.class);
        ComprasController controller = controlador(compras);

        for (String metodo : List.of("PAYPAL", "MERCADOPAGO", "STRIPE", "OXXO")) {
            var response = controller.crear(null, new ComprasController.NuevaCompra(1L, 1, metodo, null));
            assertEquals(503, response.getStatusCode().value(), metodo);
        }

        verifyNoInteractions(compras);
    }

    @Test
    void rechazaCapturarUnaOrdenSimulada() {
        ComprasService compras = mock(ComprasService.class);
        when(compras.buscar(7L)).thenReturn(Optional.of(Map.of(
            "username", "cliente",
            "estado", "PENDIENTE",
            "metodo_pago", "PAYPAL",
            "paypal_order_id", "SIM-antigua"
        )));
        ComprasController controller = controlador(compras);
        var auth = new UsernamePasswordAuthenticationToken("cliente", null, List.of());

        var response = controller.capturar(auth, 7L);

        assertEquals(409, response.getStatusCode().value());
        verify(compras, never()).confirmarPago(anyLong(), anyString());
    }

    @Test
    void continuarDevuelveLaSesionDePagoGuardada() {
        ComprasService compras = mock(ComprasService.class);
        when(compras.buscar(5L)).thenReturn(Optional.of(Map.of(
            "username", "cliente",
            "estado", "PENDIENTE",
            "paypal_order_id", "cs_test_checkout",
            "checkout_url", "https://checkout.stripe.com/c/pay/cs_test_checkout"
        )));
        ComprasController controller = controlador(compras);
        var auth = new UsernamePasswordAuthenticationToken("cliente", null, List.of());

        var response = controller.continuar(auth, 5L);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("https://checkout.stripe.com/c/pay/cs_test_checkout",
            ((Map<?, ?>) response.getBody()).get("aprobarUrl"));
        verify(compras, never()).crear(anyString(), any(), anyInt(), any(), anyString(), anyString());
    }

    @Test
    void continuarSinPasarelaConfiguradaNoIniciaUnCobro() {
        ComprasService compras = mock(ComprasService.class);
        Map<String, Object> pendiente = new HashMap<>();
        pendiente.put("username", "cliente");
        pendiente.put("estado", "PENDIENTE");
        pendiente.put("metodo_pago", "OXXO");
        when(compras.buscar(5L)).thenReturn(Optional.of(pendiente));
        ComprasController controller = controlador(compras);
        var auth = new UsernamePasswordAuthenticationToken("cliente", null, List.of());

        var response = controller.continuar(auth, 5L);

        assertEquals(503, response.getStatusCode().value());
        verify(compras, never()).crear(anyString(), any(), anyInt(), any(), anyString(), anyString());
    }
}

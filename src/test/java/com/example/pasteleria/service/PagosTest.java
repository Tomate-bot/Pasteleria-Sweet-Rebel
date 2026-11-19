package com.example.pasteleria.service;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

class PagosTest {
    private PayPalService simulado() { return new PayPalService("simulado", "", "", "", "http://localhost:5173"); }

    @Test void elMontoLoCalculaElServidor() {
        assertEquals(new BigDecimal("113.50"), ReglasCompra.monto(new BigDecimal("56.75"), 2));
        assertFalse(ReglasCompra.cantidadValida(0));
        assertFalse(ReglasCompra.cantidadValida(1001));
    }
    @Test void estadosDeLaTransaccion() {
        assertTrue(ReglasCompra.transicionValida("PENDIENTE", "PAGADA"));
        assertTrue(ReglasCompra.transicionValida("PENDIENTE", "FALLIDA"));
        assertTrue(ReglasCompra.transicionValida("PAGADA", "REEMBOLSADA"));
        assertFalse(ReglasCompra.transicionValida("FALLIDA", "PAGADA"));
        assertFalse(ReglasCompra.transicionValida("REEMBOLSADA", "PAGADA"));
        assertFalse(ReglasCompra.transicionValida("PENDIENTE", "REEMBOLSADA"));
    }
    @Test void validaMetodosDePago() {
        for (String m : new String[]{"PAYPAL", "STRIPE", "MERCADOPAGO", "OXXO"}) assertTrue(ReglasCompra.metodoValido(m));
        assertFalse(ReglasCompra.metodoValido("BITCOIN"));
    }
    @Test void pagoSimuladoExitoso() {
        var p = simulado();
        var o = p.crearOrden(new BigDecimal("10.00"), "MXN", 1);
        assertTrue(o.id().startsWith("SIM-"));
        var c = p.capturar(o.id(), false);
        assertTrue(c.ok());
        assertNotNull(c.captureId());
        assertTrue(p.reembolsar(c.captureId()));
    }
    @Test void pagoRechazadoNoEsError() {
        var c = simulado().capturar("SIM-x", true);
        assertFalse(c.ok());
        assertNull(c.captureId());
    }
    @Test void enModoSimuladoNoSeAceptanWebhooks() {
        assertFalse(simulado().webhookAutentico(java.util.Map.of(), java.util.Map.of("id", "X")));
    }
    @Test void sinCredencialesNoArrancaEnSandbox() {
        assertThrows(IllegalStateException.class, () -> new PayPalService("sandbox", "", "", "", "http://x"));
    }
}

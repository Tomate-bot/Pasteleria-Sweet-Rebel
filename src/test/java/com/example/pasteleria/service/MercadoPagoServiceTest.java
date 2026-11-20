package com.example.pasteleria.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class MercadoPagoServiceTest {
    @Test
    void noActivaRetornoAutomaticoConUrlLocalHttp() {
        Map<String, Object> cuerpo = MercadoPagoService.cuerpoPreferencia(
            12L, "Pastel", 1, new BigDecimal("100.00"), "http://localhost:5173"
        );
        Map<?, ?> retornos = (Map<?, ?>) cuerpo.get("back_urls");

        assertFalse(cuerpo.containsKey("auto_return"));
        assertEquals("http://localhost:5173/?pago=mercadopago&tx=12", retornos.get("success"));
    }

    @Test
    void mantieneRetornoAutomaticoConUrlHttps() {
        Map<String, Object> cuerpo = MercadoPagoService.cuerpoPreferencia(
            12L, "Pastel", 1, new BigDecimal("100.00"), "https://sweetrebel.example"
        );

        assertEquals("approved", cuerpo.get("auto_return"));
    }

    @Test
    void extraeElMotivoDelErrorSinMostrarCamposAjenoAlDiagnostico() {
        String detalle = MercadoPagoService.detalleErrorProveedor("""
            {
              "message": "auto_return invalid",
              "cause": [{"description": "back_url.success must be a valid URL"}],
              "access_token": "SECRET"
            }
            """);

        assertEquals("auto_return invalid; back_url.success must be a valid URL", detalle);
        assertFalse(detalle.contains("SECRET"));
    }

    @Test
    void informaCuandoLaRespuestaDeErrorNoEsJsonValido() {
        assertEquals(
            "Mercado Pago devolvió una respuesta de error con formato no reconocido.",
            MercadoPagoService.detalleErrorProveedor("<html>error</html>")
        );
    }
}

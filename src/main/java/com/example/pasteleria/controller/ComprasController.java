package com.example.pasteleria.controller;

import com.example.pasteleria.model.Cliente;
import com.example.pasteleria.model.Producto;
import com.example.pasteleria.service.ComprasService;
import com.example.pasteleria.service.PayPalService;
import com.example.pasteleria.service.PayPalService.PayPalException;
import com.example.pasteleria.service.MercadoPagoService;
import com.example.pasteleria.service.ReglasCompra;
import com.example.pasteleria.service.StripeService;
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
    private final MercadoPagoService mercadoPago;
    private final StripeService stripe;

    public ComprasController(ComprasService compras, PayPalService paypal, MercadoPagoService mercadoPago, StripeService stripe) {
        this.compras = compras; this.paypal = paypal; this.mercadoPago = mercadoPago; this.stripe = stripe;
    }

    public record NuevaCompra(Long productoId, Integer cantidad, String metodo, String clientReference) {}

    private static ResponseEntity<?> msg(int s, String m) { return ResponseEntity.status(s).body(Map.of("mensaje", m)); }
    private static boolean esAdmin(Authentication a) { return a.getAuthorities().stream().anyMatch(x -> x.getAuthority().equals("ROLE_ADMIN")); }

    @GetMapping("/config")
    public Map<String, Object> config() {
        return Map.of(
            "paypal", Map.of("disponible", !paypal.simulado(), "simulado", paypal.simulado(), "modo", paypal.modo()),
            "mercadopago", Map.of("disponible", mercadoPago.configurado(), "simulado", false),
            "stripe", Map.of("disponible", stripe.configurado(), "simulado", false),
            "oxxo", Map.of("disponible", stripe.oxxoConfigurado(), "simulado", false)
        );
    }

    @PostMapping
    public ResponseEntity<?> crear(Authentication auth, @RequestBody NuevaCompra d) {
        if (d == null || d.productoId() == null || d.cantidad() == null || !ReglasCompra.cantidadValida(d.cantidad()))
            return msg(400, "Elige un producto y una cantidad entre 1 y 1000.");
        String metodo = d.metodo() == null ? "PAYPAL" : d.metodo().toUpperCase();
        if (!ReglasCompra.metodoValido(metodo)) return msg(400, "Elige un método de pago válido.");
        if ("PAYPAL".equals(metodo) && paypal.simulado())
            return msg(503, "PayPal todavía no está conectado a una cuenta de sandbox o producción.");
        if ("MERCADOPAGO".equals(metodo) && !mercadoPago.configurado())
            return msg(503, "Mercado Pago todavía no está configurado en el servidor.");
        if ("STRIPE".equals(metodo) && !stripe.configurado())
            return msg(503, "El pago con tarjeta todavía no está configurado en Stripe.");
        if ("OXXO".equals(metodo) && !stripe.oxxoConfigurado())
            return msg(503, "OXXO requiere la clave de Stripe y su webhook de confirmación.");
        String clientReference;
        if (d.clientReference() == null || d.clientReference().isBlank()) {
            clientReference = java.util.UUID.randomUUID().toString();
        } else {
            try {
                clientReference = java.util.UUID.fromString(d.clientReference().trim()).toString();
            } catch (IllegalArgumentException ex) {
                return msg(400, "La referencia de compra no es válida.");
            }
        }
        Optional<Producto> p = compras.producto(d.productoId());
        if (p.isEmpty()) return msg(404, "Ese producto ya no existe.");
        Optional<Cliente> c = compras.clienteDe(auth.getName());
        if (c.isPresent() && (c.get().isCancelado() || c.get().isOposicion()))
            return msg(409, "Tu cuenta tiene cancelación u oposición registrada, por eso no puede comprar.");
        BigDecimal monto = ReglasCompra.monto(p.get().getPrecio(), d.cantidad());   // el servidor decide el precio
        Optional<Map<String, Object>> anterior = compras.buscarPorReferencia(auth.getName(), clientReference);
        long id;
        if (anterior.isPresent()) {
            Map<String, Object> tx = anterior.get();
            if (((Number) tx.get("producto_id")).longValue() != d.productoId()
                    || ((Number) tx.get("cantidad")).intValue() != d.cantidad()
                    || !metodo.equals(tx.get("metodo_pago")))
                return msg(409, "La referencia de compra ya fue usada con otros datos.");
            id = ((Number) tx.get("id")).longValue();
            if ("PENDIENTE".equals(tx.get("estado")) && tx.get("checkout_url") == null && tx.get("paypal_order_id") != null)
                return msg(409, "Esta compra tiene una sesión anterior sin enlace guardado. No iniciaremos otro cobro para evitar duplicados; contacta a la pastelería.");
            boolean crearOrden = "PENDIENTE".equals(tx.get("estado")) && tx.get("checkout_url") == null;
            if (!crearOrden) {
                Map<String, Object> r = new HashMap<>();
                r.put("transaccionId", id); r.put("monto", tx.get("monto"));
                r.put("aprobarUrl", tx.get("checkout_url"));
                return ResponseEntity.ok(r);
            }
        } else {
            try {
                id = compras.crear(auth.getName(), p.get(), d.cantidad(), monto, metodo, clientReference);
            } catch (org.springframework.dao.DataIntegrityViolationException ex) {
                return msg(409, "La compra ya fue iniciada. Abre Mis compras para revisar su estado.");
            }
        }
        try {
            String ordenId;
            String aprobarUrl;
            if ("PAYPAL".equals(metodo)) {
                PayPalService.Orden o = paypal.crearOrden(monto, "MXN", id);
                ordenId = o.id(); aprobarUrl = o.aprobarUrl();
            } else if ("MERCADOPAGO".equals(metodo)) {
                MercadoPagoService.Preferencia pref = mercadoPago.crearPreferencia(id, p.get().getNombre(), d.cantidad(), monto);
                ordenId = pref.id(); aprobarUrl = pref.url();
            } else {
                StripeService.Checkout checkout = stripe.crearCheckout(id, p.get().getNombre(), d.cantidad(), monto, metodo);
                ordenId = checkout.id(); aprobarUrl = checkout.url();
            }
            compras.guardarOrden(id, ordenId, aprobarUrl);
            Map<String, Object> r = new HashMap<>();
            r.put("transaccionId", id); r.put("monto", monto); r.put("aprobarUrl", aprobarUrl);
            return ResponseEntity.status(201).body(r);
        } catch (PayPalException | IllegalStateException e) {
            return msg(502, e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> detalle(Authentication auth, @PathVariable long id) {
        Optional<Map<String, Object>> t = compras.buscar(id);
        if (t.isEmpty() || (!esAdmin(auth) && !t.get().get("username").equals(auth.getName())))
            return msg(404, "No encontramos esa compra.");
        return ResponseEntity.ok(compras.detalle(id));
    }

    @PostMapping("/{id}/continuar")
    public ResponseEntity<?> continuar(Authentication auth, @PathVariable long id) {
        Optional<Map<String, Object>> encontrada = compras.buscar(id);
        if (encontrada.isEmpty() || (!esAdmin(auth) && !encontrada.get().get("username").equals(auth.getName())))
            return msg(404, "No encontramos esa compra.");
        Map<String, Object> transaccion = encontrada.get();
        if (!"PENDIENTE".equals(transaccion.get("estado")))
            return msg(409, "Esta compra ya no está pendiente; revisa su estado antes de intentar otro pago.");
        String checkoutUrl = (String) transaccion.get("checkout_url");
        if (checkoutUrl != null && !checkoutUrl.isBlank()) return ResponseEntity.ok(Map.of("aprobarUrl", checkoutUrl));
        if (transaccion.get("paypal_order_id") != null)
            return msg(409, "Esta compra tiene una sesión anterior sin enlace guardado. No iniciaremos otro cobro para evitar duplicados; contacta a la pastelería.");

        String metodo = String.valueOf(transaccion.get("metodo_pago"));
        if ("PAYPAL".equals(metodo) && paypal.simulado())
            return msg(503, "PayPal no está conectado en el servidor. No se inició ningún cobro.");
        if ("MERCADOPAGO".equals(metodo) && !mercadoPago.configurado())
            return msg(503, "Mercado Pago no está configurado en el servidor. No se inició ningún cobro.");
        if ("STRIPE".equals(metodo) && !stripe.configurado())
            return msg(503, "Stripe para tarjeta no está configurado en el servidor. No se inició ningún cobro.");
        if ("OXXO".equals(metodo) && !stripe.oxxoConfigurado())
            return msg(503, "OXXO requiere las claves de Stripe y su webhook. No se inició ningún cobro.");

        Optional<Producto> producto = compras.producto(((Number) transaccion.get("producto_id")).longValue());
        if (producto.isEmpty()) return msg(404, "El producto de esta compra ya no está disponible.");
        BigDecimal monto = (BigDecimal) transaccion.get("monto");
        int cantidad = ((Number) transaccion.get("cantidad")).intValue();
        try {
            String ordenId;
            String url;
            if ("PAYPAL".equals(metodo)) {
                PayPalService.Orden orden = paypal.crearOrden(monto, "MXN", id);
                ordenId = orden.id(); url = orden.aprobarUrl();
            } else if ("MERCADOPAGO".equals(metodo)) {
                MercadoPagoService.Preferencia preferencia = mercadoPago.crearPreferencia(id, producto.get().getNombre(), cantidad, monto);
                ordenId = preferencia.id(); url = preferencia.url();
            } else if ("STRIPE".equals(metodo) || "OXXO".equals(metodo)) {
                StripeService.Checkout checkout = stripe.crearCheckout(id, producto.get().getNombre(), cantidad, monto, metodo);
                ordenId = checkout.id(); url = checkout.url();
            } else {
                return msg(409, "Esta compra no tiene un método de pago compatible para continuar.");
            }
            if (url == null || url.isBlank()) return msg(502, "La pasarela no devolvió un enlace; no se inició el pago.");
            compras.guardarOrden(id, ordenId, url);
            return ResponseEntity.ok(Map.of("aprobarUrl", url));
        } catch (PayPalException | IllegalStateException e) {
            return msg(502, e.getMessage());
        }
    }

    @PostMapping("/{id}/mercadopago/confirmar")
    public ResponseEntity<?> confirmarMercadoPago(Authentication auth, @PathVariable long id, @RequestParam String paymentId) {
        Optional<Map<String, Object>> t = compras.buscar(id);
        if (t.isEmpty() || (!esAdmin(auth) && !t.get().get("username").equals(auth.getName())))
            return msg(404, "No encontramos esa compra.");
        if (!"MERCADOPAGO".equals(t.get().get("metodo_pago")))
            return msg(409, "Esta compra no corresponde a Mercado Pago.");
        if (!"PENDIENTE".equals(t.get().get("estado")))
            return msg(409, "Esta compra ya fue procesada (" + t.get().get("estado") + ").");
        try {
            MercadoPagoService.EstadoPago pago = mercadoPago.verificarPago(paymentId, id, (BigDecimal) t.get().get("monto"));
            if (!pago.coincide()) return msg(409, "El pago no coincide con esta compra.");
            if ("approved".equals(pago.estado())) {
                compras.confirmarPago(id, paymentId);
                return msg(200, "¡Pago recibido! Tu compra quedó registrada.");
            }
            if ("rejected".equals(pago.estado()) || "cancelled".equals(pago.estado())) {
                compras.marcar(id, "PENDIENTE", "FALLIDA");
                return msg(402, "Mercado Pago rechazó el pago. No se registró como pagado.");
            }
            return msg(202, "El pago sigue pendiente de confirmación en Mercado Pago.");
        } catch (IllegalArgumentException e) {
            return msg(400, e.getMessage());
        } catch (IllegalStateException e) {
            return msg(502, e.getMessage());
        }
    }

    @PostMapping("/{id}/stripe/confirmar")
    public ResponseEntity<?> confirmarStripe(Authentication auth, @PathVariable long id, @RequestParam String sessionId) {
        Optional<Map<String, Object>> t = compras.buscar(id);
        if (t.isEmpty() || (!esAdmin(auth) && !t.get().get("username").equals(auth.getName())))
            return msg(404, "No encontramos esa compra.");
        String metodo = String.valueOf(t.get().get("metodo_pago"));
        if (!"STRIPE".equals(metodo) && !"OXXO".equals(metodo))
            return msg(409, "Esta compra no corresponde a Stripe.");
        if (!"PENDIENTE".equals(t.get().get("estado")))
            return msg(409, "Esta compra ya fue procesada (" + t.get().get("estado") + ").");
        try {
            StripeService.EstadoSesion estado = stripe.verificarCheckout(sessionId,
                (String) t.get().get("paypal_order_id"), id, (BigDecimal) t.get().get("monto"), metodo);
            if (!estado.coincide()) return msg(409, "La sesión de Stripe no coincide con esta compra.");
            if ("paid".equals(estado.estadoPago()) && estado.paymentIntentId() != null) {
                compras.confirmarPago(id, estado.paymentIntentId());
                return msg(200, "Pago confirmado por Stripe. La compra quedó registrada.");
            }
            if ("expired".equals(estado.estadoSesion())) {
                compras.marcar(id, "PENDIENTE", "FALLIDA");
                return msg(402, "La sesión de pago venció. No se registró ningún cobro.");
            }
            return ResponseEntity.status(202).body(Map.of("mensaje", "Stripe todavía no confirma el pago. Si elegiste OXXO, paga el vale; la compra se actualizará cuando Stripe avise."));
        } catch (IllegalArgumentException e) {
            return msg(400, e.getMessage());
        } catch (IllegalStateException e) {
            return msg(502, e.getMessage());
        }
    }

    @PostMapping("/{id}/capturar")
    public ResponseEntity<?> capturar(Authentication auth, @PathVariable long id) {
        Optional<Map<String, Object>> t = compras.buscar(id);
        if (t.isEmpty() || (!esAdmin(auth) && !t.get().get("username").equals(auth.getName()))) return msg(404, "No encontramos esa compra.");
        if (!"PENDIENTE".equals(t.get().get("estado"))) return msg(409, "Esta compra ya fue procesada (" + t.get().get("estado") + ").");
        if (!"PAYPAL".equals(t.get().get("metodo_pago")))
            return msg(409, "Esta compra no puede confirmarse mediante PayPal.");
        try {
            String orden = (String) t.get().get("paypal_order_id");
            if (orden == null || orden.startsWith("SIM-"))
                return msg(409, "Esta compra no tiene una orden de pago activa. No se realizó ningún cobro; reintenta con una pasarela configurada.");
            PayPalService.Captura c = paypal.capturar(orden, false);
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
            if (cap != null && cap.startsWith("SIMCAP-"))
                return msg(409, "Esta compra no tiene un reembolso real asociado.");
            boolean reembolsado = cap != null && ("MERCADOPAGO".equals(t.get().get("metodo_pago"))
                    ? mercadoPago.reembolsar(cap)
                    : ("STRIPE".equals(t.get().get("metodo_pago")) || "OXXO".equals(t.get().get("metodo_pago")))
                        ? stripe.reembolsar(cap) : paypal.reembolsar(cap));
            if (!reembolsado) return msg(502, "La pasarela no completó el reembolso. Intenta más tarde.");
        } catch (PayPalException e) { return msg(e.status == 422 ? 502 : e.status, e.getMessage()); }
        catch (IllegalStateException e) { return msg(502, e.getMessage()); }
        compras.marcar(id, "PAGADA", "REEMBOLSADA");
        return msg(200, "Reembolso registrado.");
    }
}

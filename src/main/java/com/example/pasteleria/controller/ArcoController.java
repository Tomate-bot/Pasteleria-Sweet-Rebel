package com.example.pasteleria.controller;

import com.example.pasteleria.model.Cliente;
import com.example.pasteleria.repository.ClienteRepository;
import java.security.Principal;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Derechos ARCO del titular autenticado; no admite IDs ajenos en la URL. */
@RestController
@RequestMapping("/api/arco")
public class ArcoController {
    private final ClienteRepository clientes;
    public ArcoController(ClienteRepository clientes) { this.clientes = clientes; }

    @GetMapping("/mis-datos") public ResponseEntity<?> acceso(Principal principal) {
        return clientes.findByUsuario(principal.getName())
            .map(c -> ResponseEntity.ok((Object) vista(c)))
            .orElse(ResponseEntity.notFound().build());
    }
    @PutMapping("/rectificacion") public ResponseEntity<?> rectificar(Principal principal, @RequestBody ClienteController.DatosCliente datos) {
        String error = ClienteController.validar(datos);
        if (error != null) return ResponseEntity.badRequest().body(Map.of("mensaje", error));
        return clientes.findByUsuario(principal.getName()).map(c -> {
            if (c.isCancelado()) return ResponseEntity.status(409).body(Map.of("mensaje", "La cuenta ya está cancelada."));
            if (clientes.existsByEmailIgnoreCaseAndIdNot(datos.email().trim(), c.getId()))
                return ResponseEntity.status(409).body(Map.of("mensaje", "El correo ya está registrado."));
            ClienteController.llenar(c, datos);
            return ResponseEntity.ok((Object) vista(clientes.save(c)));
        }).orElse(ResponseEntity.notFound().build());
    }
    @PatchMapping("/oposicion") public ResponseEntity<?> oposicion(Principal principal) {
        return clientes.findByUsuario(principal.getName()).map(c -> {
            if (c.isCancelado()) return ResponseEntity.status(409).body(Map.of("mensaje", "Cuenta ya cancelada."));
            c.setOposicion(true); clientes.save(c);
            return ResponseEntity.ok((Object) Map.of("mensaje", "Oposición registrada: se detiene el tratamiento opcional y la creación de nuevos pedidos.", "id", c.getId()));
        }).orElse(ResponseEntity.notFound().build());
    }
    @DeleteMapping("/cancelacion") public ResponseEntity<?> cancelar(Principal principal) {
        return clientes.findByUsuario(principal.getName()).map(c -> {
            if (c.isCancelado()) return ResponseEntity.status(409).body(Map.of("mensaje", "Cancelación previamente registrada."));
            // Ejemplo escolar: seudonimiza; mantiene vinculación mínima para integridad y obligaciones de pedidos.
            c.setCancelado(true); c.setOposicion(true);
            c.setNombre("Cliente cancelado"); c.setEmail("cancelado-" + c.getId() + "@example.invalid"); c.setTelefono(null);
            clientes.save(c);
            return ResponseEntity.ok((Object) Map.of("mensaje", "Cancelación aplicada: datos directos seudonimizados, pedidos conservados por integridad.", "id", c.getId()));
        }).orElse(ResponseEntity.notFound().build());
    }
    private VistaCliente vista(Cliente c) {
        return new VistaCliente(c.getId(), c.getNombre(), c.getEmail(), c.getTelefono(), c.isOposicion(), c.isCancelado());
    }
    public record VistaCliente(Long id, String nombre, String email, String telefono, boolean oposicion, boolean cancelado) {}
}

package com.example.pasteleria.controller;

import com.example.pasteleria.model.Cliente;
import com.example.pasteleria.repository.ClienteRepository;
import com.example.pasteleria.repository.PedidoRepository;
import com.example.pasteleria.service.ReglasCodigo;
import com.example.pasteleria.service.ReglasPerfil;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {
    private final ClienteRepository clientes;
    private final PedidoRepository pedidos;

    public ClienteController(ClienteRepository clientes, PedidoRepository pedidos) {
        this.clientes = clientes; this.pedidos = pedidos;
    }

    @GetMapping public List<Cliente> listar() { return clientes.findAll(); }
    @GetMapping("/{id}") public ResponseEntity<Cliente> obtener(@PathVariable Long id) {
        return clientes.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
    @PostMapping public ResponseEntity<?> crear(@RequestBody DatosCliente datos) {
        String error = validar(datos);
        if (error != null) return ResponseEntity.badRequest().body(Map.of("mensaje", error));
        if (clientes.existsByEmailIgnoreCase(datos.email().trim()))
            return ResponseEntity.status(409).body(Map.of("mensaje", "El correo ya está registrado."));
        Cliente c = new Cliente(); llenar(c, datos);
        return ResponseEntity.status(201).body(clientes.save(c));
    }
    @PutMapping("/{id}") public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody DatosCliente datos) {
        String error = validar(datos);
        if (error != null) return ResponseEntity.badRequest().body(Map.of("mensaje", error));
        return clientes.findById(id).map(c -> {
            if (c.isCancelado()) return ResponseEntity.status(409).body(Map.of("mensaje", "Cliente cancelado: no se puede modificar."));
            if (clientes.existsByEmailIgnoreCaseAndIdNot(datos.email().trim(), id))
                return ResponseEntity.status(409).body(Map.of("mensaje", "El correo ya está registrado."));
            llenar(c, datos); return ResponseEntity.ok(clientes.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }
    @DeleteMapping("/{id}") public ResponseEntity<?> eliminar(@PathVariable Long id) {
        if (!clientes.existsById(id)) return ResponseEntity.notFound().build();
        if (pedidos.existsByClienteId(id))
            return ResponseEntity.status(409).body(Map.of("mensaje", "El cliente tiene pedidos; usa la cancelación ARCO si corresponde."));
        clientes.deleteById(id); return ResponseEntity.noContent().build();
    }

    public static String validar(DatosCliente d) {
        if (d == null || d.nombre() == null || d.nombre().isBlank() || d.nombre().trim().length() > 100)
            return "nombre es obligatorio (máximo 100 caracteres).";
        if (!ReglasCodigo.emailValido(d.email()))
            return "email debe tener un formato válido (máximo 150 caracteres).";
        if (!ReglasPerfil.textoCortoValido(d.nombre())) return "nombre contiene caracteres no permitidos.";
        if (ReglasPerfil.telefono(d.telefono()) == null) return "telefono debe contener 10 dígitos.";
        return null;
    }
    public static void llenar(Cliente c, DatosCliente d) {
        c.setNombre(d.nombre().trim()); c.setEmail(d.email().trim().toLowerCase());
        String telefono = ReglasPerfil.telefono(d.telefono());
        c.setTelefono(telefono == null || telefono.isEmpty() ? null : telefono);
    }
    public record DatosCliente(String nombre, String email, String telefono) {}
}

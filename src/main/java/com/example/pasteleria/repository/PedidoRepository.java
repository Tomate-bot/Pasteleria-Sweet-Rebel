package com.example.pasteleria.repository;

import com.example.pasteleria.model.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {
    boolean existsByClienteId(Long id);
    boolean existsByProductoId(Long id);
}

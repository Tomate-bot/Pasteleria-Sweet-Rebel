package com.example.pasteleria.repository;

import com.example.pasteleria.model.Producto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductoRepository extends JpaRepository<Producto, Long> {
    boolean existsByReposteroId(Long id);
    boolean existsByCategoriaId(Long id);
}

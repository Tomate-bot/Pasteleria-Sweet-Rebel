package com.example.pasteleria.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "producto")
public class Producto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 150)
    private String nombre;
    @Column(length = 300)
    private String descripcion;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;
    @ManyToOne @JoinColumn(name = "id_repostero", nullable = false)
    private Repostero repostero;
    @ManyToOne @JoinColumn(name = "id_categoria", nullable = false)
    private Categoria categoria;

    public Producto() {}
    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }
    public Repostero getRepostero() { return repostero; }
    public void setRepostero(Repostero repostero) { this.repostero = repostero; }
    public Categoria getCategoria() { return categoria; }
    public void setCategoria(Categoria categoria) { this.categoria = categoria; }
}

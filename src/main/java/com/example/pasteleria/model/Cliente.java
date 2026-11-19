package com.example.pasteleria.model;

import jakarta.persistence.*;

@Entity
@Table(name = "cliente")
public class Cliente {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 100)
    private String nombre;
    @Column(nullable = false, length = 150, unique = true)
    private String email;
    @Column(length = 20)
    private String telefono;
    @Column(name = "usuario", length = 50, unique = true)
    private String usuario;
    @Column(nullable = false)
    private boolean oposicion = false;
    @Column(nullable = false)
    private boolean cancelado = false;

    public Cliente() {}
    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getUsuario() { return usuario; }
    public void setUsuario(String usuario) { this.usuario = usuario; }
    public boolean isOposicion() { return oposicion; }
    public void setOposicion(boolean oposicion) { this.oposicion = oposicion; }
    public boolean isCancelado() { return cancelado; }
    public void setCancelado(boolean cancelado) { this.cancelado = cancelado; }
}

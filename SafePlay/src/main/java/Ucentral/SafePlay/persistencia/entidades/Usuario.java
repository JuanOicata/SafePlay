package Ucentral.SafePlay.persistencia.entidades;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Table(name = "usuarios")
@Entity
public class Usuario {

    @Id
    @Column(name = "usu_usuario")
    private String usuario;

    @Column(name = "usu_contrasena", nullable = false)
    private String contrasena;

    @Column(name = "usu_nombre", nullable = false)
    private String nombre;

    @Column(name = "usu_cedula", nullable = false)
    private Long cedula;

    @Column(name = "usu_telefono", nullable = false)
    private Long telefono;

    @Column(name = "usu_rol", nullable = false)
    private String rol;

    // Constructor vacío
    public Usuario() {
    }

    // Constructor completo
    public Usuario(String usuario, String contrasena, String nombre, Long cedula, Long telefono, String rol) {
        this.usuario = usuario;
        this.contrasena = contrasena;
        this.nombre = nombre;
        this.cedula = cedula;
        this.telefono = telefono;
        this.rol = rol;
    }

    // Getters y Setters - todos explícitamente definidos
    public String getUsuario() {
        return usuario;
    }

    public void setUsuario(String usuario) {
        this.usuario = usuario;
    }

    public String getContrasena() {
        return contrasena;
    }

    public void setContrasena(String contrasena) {
        this.contrasena = contrasena;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public Long getCedula() {
        return cedula;
    }

    public void setCedula(Long cedula) {
        this.cedula = cedula;
    }

    public Long getTelefono() {
        return telefono;
    }

    public void setTelefono(Long telefono) {
        this.telefono = telefono;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }
}
package Ucentral.SafePlay.persistencia.entidades;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
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
    private long cedula;

    @Column(name = "usu_telefono", nullable = false)
    private long telefono;

    @Column(name = "usu_rol", nullable = false)
    private String rol;
}

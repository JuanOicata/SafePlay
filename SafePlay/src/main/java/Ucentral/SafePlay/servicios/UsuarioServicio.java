package Ucentral.SafePlay.servicios;

import Ucentral.SafePlay.persistencia.entidades.Usuario;
import Ucentral.SafePlay.persistencia.repositorio.UsuarioRepositorio;
import org.springframework.stereotype.Service;

@Service
public class UsuarioServicio {

    UsuarioRepositorio usuarioRepositorio;

    // Constructor con inyección de dependencias
    public UsuarioServicio(UsuarioRepositorio usuarioRepositorio) {
        this.usuarioRepositorio = usuarioRepositorio;
    }

    public Usuario guardarUsuario(Usuario usuario) {
        // Guardar directamente el usuario
        return usuarioRepositorio.save(usuario);
    }

    public boolean existeUsuario(String usuario) {
        return usuarioRepositorio.existsById(usuario);
    }

    public Usuario validarUsuario(String nombreUsuario, String contraseña) {
        Usuario usuario = usuarioRepositorio.findByNombre(nombreUsuario);

        if (usuario != null) {
            System.out.println("Usuario encontrado: " + usuario.getNombre());
            System.out.println("Contraseña ingresada: " + contraseña);
            System.out.println("Contraseña en BD: " + usuario.getContrasena());

            if (usuario.getContrasena().equals(contraseña)) {
                return usuario;
            }
        } else {
            System.out.println("No se encontró usuario con nombre: " + nombreUsuario);
        }

        return null;
    }


}
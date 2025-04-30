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
}
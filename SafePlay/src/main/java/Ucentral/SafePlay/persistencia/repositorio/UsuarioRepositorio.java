package Ucentral.SafePlay.persistencia.repositorio;

import Ucentral.SafePlay.persistencia.entidades.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepositorio extends JpaRepository<Usuario, String> {
    Usuario findByNombre(String nombre);
}

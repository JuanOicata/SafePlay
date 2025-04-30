package Ucentral.SafePlay.persistencia.repositorio;

import Ucentral.SafePlay.persistencia.entidades.Usuario;
import org.springframework.data.repository.CrudRepository;

public interface UsuarioRepositorio  extends CrudRepository<Usuario, String> {

}

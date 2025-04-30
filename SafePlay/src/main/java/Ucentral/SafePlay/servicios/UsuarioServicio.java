package Ucentral.SafePlay.servicios;

import Ucentral.SafePlay.persistencia.repositorio.UsuarioRepositorio;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@AllArgsConstructor
@Service

public class UsuarioServicio {

    @Autowired
    UsuarioRepositorio usuarioRepositorio;

}

package Ucentral.SafePlay.controladores;

import Ucentral.SafePlay.servicios.UsuarioServicio;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@AllArgsConstructor
@Controller

public class UsuarioControlador {

    @GetMapping("/")
    public String mostrarPaginaPrincipal() {
        return "index"; // Devuelve index.html
    }
    @Autowired
    private UsuarioServicio usuarioServicio;

}

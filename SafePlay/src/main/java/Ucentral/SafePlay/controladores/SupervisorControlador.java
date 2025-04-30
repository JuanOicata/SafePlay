package Ucentral.SafePlay.controladores;

import Ucentral.SafePlay.servicios.VideojuegoServicio;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/supervisor")
public class SupervisorControlador {

    @Autowired
    private VideojuegoServicio videojuegoServicio;

    @GetMapping
    public String mostrarVideojuegos(Model model) {
        // Simula un usuario (puedes obtenerlo de la autenticación real)
        model.addAttribute("usuario", new Usuario("Supervisor")); // Ajusta según tu modelo de usuario
        model.addAttribute("videojuegos", videojuegoServicio.obtenerVideojuegos());
        return "supervisor"; // Nombre del archivo HTML (sin .html)
    }
}

// Clase auxiliar para el ejemplo (ajústala según tu modelo real)
class Usuario {
    private String nombre;

    public Usuario(String nombre) {
        this.nombre = nombre;
    }

    public String getNombre() {
        return nombre;
    }
}
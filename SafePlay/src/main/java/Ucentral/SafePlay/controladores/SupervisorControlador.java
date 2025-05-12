package Ucentral.SafePlay.controladores;

import Ucentral.SafePlay.persistencia.entidades.Usuario;
import Ucentral.SafePlay.persistencia.entidades.Videojuego;
import Ucentral.SafePlay.persistencia.entidades.VideojuegoDTO;
import Ucentral.SafePlay.persistencia.repositorio.VideojuegoRepositorio;
import Ucentral.SafePlay.servicios.VideojuegoServicio;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@Controller
@RequestMapping("/supervisor")
public class SupervisorControlador {

    @Autowired
    private VideojuegoServicio videojuegoServicio;

    @Autowired
    private VideojuegoRepositorio videojuegoRepositorio;

    @GetMapping
    public String mostrarVideojuegos(HttpSession session, Model model) {
        Usuario usuario = (Usuario) session.getAttribute("usuarioLogueado");
        if (usuario == null || !"supervisor".equalsIgnoreCase(usuario.getRol())) {
            return "redirect:/login";
        }

        List<VideojuegoDTO> videojuegos = videojuegoServicio.obtenerVideojuegos();
        // Aplicar estados de aprobación desde la base de datos
        for (VideojuegoDTO juego : videojuegos) {
            Videojuego entidad = videojuegoRepositorio.findById(juego.getTitle()).orElse(new Videojuego());
            juego.setApproved(entidad.isApproved());
        }

        model.addAttribute("usuario", usuario);
        model.addAttribute("videojuegos", videojuegos);
        return "supervisor";
    }

    @PostMapping("/aprobar")
    public String aprobarJuego(@RequestParam("title") String title, @RequestParam("isApproved") boolean isApproved) {
        // Guardar el estado de aprobación en la base de datos
        Videojuego videojuego = videojuegoRepositorio.findById(title).orElse(new Videojuego());
        videojuego.setTitle(title);
        videojuego.setApproved(isApproved);
        videojuegoRepositorio.save(videojuego);
        return "redirect:/supervisor";
    }
}
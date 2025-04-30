package Ucentral.SafePlay.controladores;

import Ucentral.SafePlay.persistencia.entidades.Usuario;
import Ucentral.SafePlay.servicios.UsuarioServicio;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

@Controller
public class UsuarioControlador {

    private final UsuarioServicio usuarioServicio;

    // Constructor con inyección de dependencias
    public UsuarioControlador(UsuarioServicio usuarioServicio) {
        this.usuarioServicio = usuarioServicio;
    }

    @GetMapping("/")
    public String mostrarPaginaPrincipal() {
        return "index";
    }

    @GetMapping("/registro")
    public String mostrarFormularioRegistro(Model model) {
        // Crear un nuevo objeto Usuario y agregarlo al modelo
        Usuario usuario = new Usuario();
        model.addAttribute("elusuario", usuario);
        return "registro";
    }

    /*@PostMapping("/almacenar")
    public String registrarUsuario(@ModelAttribute("elusuario") Usuario usuario, BindingResult result, Model model) {
        // Verificar si hay errores de validación
        if (result.hasErrors()) {
            return "registro";
        }

        try {
            // Asignar rol por defecto
            usuario.setRol("USUARIO");
            // Guardar el usuario
            usuarioServicio.guardarUsuario(usuario);
            return "redirect:/registro-exitoso";
        } catch (Exception e) {
            model.addAttribute("error", "Error al registrar usuario: " + e.getMessage());
            return "registro";
        }
    }*/
    @PostMapping("/almacenar")
    public String almacenarUsuario(@ModelAttribute("elusuario")Usuario usuario, BindingResult result, Model model) {
        if (result.hasErrors()) {
            return "registro"; // Nombre de la plantilla HTML
        }
        usuarioServicio.guardarUsuario(usuario);
        return "redirect:/";
    }

    @GetMapping("/registro-exitoso")
    public String mostrarRegistroExitoso() {
        return "registro-exitoso";
    }
}
package Ucentral.SafePlay.persistencia.entidades;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "videojuegos")
public class Videojuego {

    @Id
    private String title; // Usamos el título como clave primaria (puedes usar un ID numérico si prefieres)
    private boolean isApproved;

    // Getters y setters
    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public boolean isApproved() {
        return isApproved;
    }

    public void setApproved(boolean approved) {
        isApproved = approved;
    }
}
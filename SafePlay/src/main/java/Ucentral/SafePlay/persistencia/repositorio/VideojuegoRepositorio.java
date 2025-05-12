package Ucentral.SafePlay.persistencia.repositorio;

import Ucentral.SafePlay.persistencia.entidades.Videojuego;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideojuegoRepositorio extends JpaRepository<Videojuego, String> {
}
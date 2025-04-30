package Ucentral.SafePlay.persistencia.entidades;

public class VideojuegoDTO {

    private String title; // Cambiado de 'name' a 'title' para coincidir con la API
    private String releaseDate; // Cambiado de 'released' a 'releaseDate'
    private String thumbnail; // Cambiado de 'background_image' a 'thumbnail'

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getReleaseDate() {
        return releaseDate;
    }

    public void setReleaseDate(String releaseDate) {
        this.releaseDate = releaseDate;
    }

    public String getThumbnail() {
        return thumbnail;
    }

    public void setThumbnail(String thumbnail) {
        this.thumbnail = thumbnail;
    }
}
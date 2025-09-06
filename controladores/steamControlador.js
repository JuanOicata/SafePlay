// controladores/steamControlador.js
import SteamService from '../services/steamService.js';

class SteamControlador {
    constructor() {
        this.steamService = new SteamService();
    }

    // Obtener URL de autenticación de Steam
    getAuthUrl(req, res) {
        try {
            // Para autenticación de Steam, redirigimos a la ruta de Passport
            const baseUrl = req.protocol + '://' + req.get('host');
            const authUrl = `${baseUrl}/auth/steam`;

            res.json({
                success: true,
                url: authUrl
            });
        } catch (error) {
            console.error('Error generando URL Steam:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando URL de autenticación'
            });
        }
    }

    // Manejar callback de Steam
    handleCallback(req, res) {
        try {
            // Este método será manejado principalmente por Passport
            // Aquí puedes agregar lógica adicional si es necesario
            res.json({
                success: true,
                message: 'Callback procesado correctamente'
            });
        } catch (error) {
            console.error('Error en callback Steam:', error);
            res.status(500).json({
                success: false,
                message: 'Error procesando callback de Steam'
            });
        }
    }

    // Obtener perfil del usuario
    async getUserProfile(req, res) {
        try {
            const { steamId } = req.params;

            console.log(`Obteniendo perfil para Steam ID: ${steamId}`);
            const profile = await this.steamService.getPlayerSummary(steamId);

            res.json({
                success: true,
                data: profile
            });

        } catch (error) {
            console.error('Error obteniendo perfil:', error);

            if (error.message.includes('Steam API Key')) {
                return res.status(500).json({
                    success: false,
                    message: 'Configuración de Steam API incompleta'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error obteniendo perfil del usuario',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Obtener juegos del usuario
    async getUserGames(req, res) {
        try {
            const { steamId } = req.params;
            const { limit, sortBy } = req.query;

            console.log(`Obteniendo juegos para Steam ID: ${steamId}`);
            const gamesData = await this.steamService.getOwnedGames(steamId, true, true);

            let games = gamesData.games;

            // Aplicar ordenamiento si se especifica
            if (sortBy) {
                switch (sortBy) {
                    case 'playtime':
                        games.sort((a, b) => b.playtime_forever - a.playtime_forever);
                        break;
                    case 'name':
                        games.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                        break;
                    case 'recent':
                        games.sort((a, b) => (b.playtime_2weeks || 0) - (a.playtime_2weeks || 0));
                        break;
                }
            }

            // Aplicar límite si se especifica
            if (limit && !isNaN(parseInt(limit))) {
                games = games.slice(0, parseInt(limit));
            }

            res.json({
                success: true,
                data: {
                    total_count: gamesData.game_count,
                    returned_count: games.length,
                    games: games
                }
            });

        } catch (error) {
            console.error('Error obteniendo juegos:', error);

            if (error.message.includes('Steam API Key')) {
                return res.status(500).json({
                    success: false,
                    message: 'Configuración de Steam API incompleta'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error obteniendo juegos del usuario',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Obtener resumen del usuario
    async getUserSummary(req, res) {
        try {
            const { steamId } = req.params;

            console.log(`Obteniendo resumen completo para Steam ID: ${steamId}`);
            const summary = await this.steamService.getUserSummary(steamId);

            res.json({
                success: true,
                data: summary
            });

        } catch (error) {
            console.error('Error obteniendo resumen:', error);

            if (error.message.includes('Steam API Key')) {
                return res.status(500).json({
                    success: false,
                    message: 'Configuración de Steam API incompleta'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error obteniendo resumen del usuario',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Obtener estadísticas de juego
    async getGameStats(req, res) {
        try {
            const { steamId, appId } = req.params;

            console.log(`Obteniendo estadísticas para Steam ID: ${steamId}, App ID: ${appId}`);
            const stats = await this.steamService.getPlayerStatsForGame(steamId, appId);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);

            if (error.message.includes('Steam API Key')) {
                return res.status(500).json({
                    success: false,
                    message: 'Configuración de Steam API incompleta'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error obteniendo estadísticas del juego',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Obtener logros del juego
    async getGameAchievements(req, res) {
        try {
            const { steamId, appId } = req.params;

            console.log(`Obteniendo logros para Steam ID: ${steamId}, App ID: ${appId}`);
            const achievements = await this.steamService.getPlayerAchievements(steamId, appId);

            res.json({
                success: true,
                data: achievements
            });

        } catch (error) {
            console.error('Error obteniendo logros:', error);

            if (error.message.includes('Steam API Key')) {
                return res.status(500).json({
                    success: false,
                    message: 'Configuración de Steam API incompleta'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error obteniendo logros del juego',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Obtener estadísticas parentales
    async getParentalStats(req, res) {
        try {
            const { steamId } = req.params;

            console.log(`Obteniendo estadísticas parentales para Steam ID: ${steamId}`);
            const parentalStats = await this.steamService.getParentalStats(steamId);

            res.json({
                success: true,
                data: parentalStats
            });

        } catch (error) {
            console.error('Error obteniendo estadísticas parentales:', error);

            if (error.message.includes('Steam API Key')) {
                return res.status(500).json({
                    success: false,
                    message: 'Configuración de Steam API incompleta'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error obteniendo estadísticas parentales',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Verificar salud de la API
    async checkHealth(req, res) {
        try {
            const health = await this.steamService.checkApiHealth();

            const statusCode = health.status === 'healthy' ? 200 : 503;

            res.status(statusCode).json({
                success: health.status === 'healthy',
                data: {
                    status: health.status,
                    timestamp: new Date().toISOString(),
                    apiKeyConfigured: health.apiKeyConfigured,
                    ...(health.error && { error: health.error })
                }
            });

        } catch (error) {
            console.error('Error verificando salud:', error);
            res.status(500).json({
                success: false,
                message: 'Error verificando estado de la API',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Manejar webhook
    handleWebhook(req, res) {
        try {
            const { body } = req;

            console.log('Webhook recibido de Steam:', body);

            // Aquí podrías procesar actualizaciones específicas de Steam
            // Por ejemplo: cambios en el perfil, nuevos juegos, logros, etc.

            res.json({
                success: true,
                message: 'Webhook procesado correctamente',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error procesando webhook:', error);
            res.status(500).json({
                success: false,
                message: 'Error procesando webhook',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

export default SteamControlador;
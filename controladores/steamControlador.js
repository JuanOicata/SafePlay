// controladores/steamControlador.js - Controlador para manejo de Steam API

const SteamService = require('../services/steamService');

class SteamControlador {
    constructor() {
        this.steamService = new SteamService();
    }

    /**
     * Obtener URL de autorización de Steam
     * GET /api/steam/auth-url
     */
    async getAuthUrl(req, res) {
        try {
            const authUrl = this.steamService.generateAuthUrl();

            res.json({
                success: true,
                authUrl: authUrl
            });

        } catch (error) {
            console.error('Error generando URL de Steam:', error);
            res.status(500).json({
                success: false,
                message: 'Error al generar URL de autorización'
            });
        }
    }

    /**
     * Callback de Steam OpenID
     * GET /api/steam/callback
     */
    async handleCallback(req, res) {
        try {
            console.log('🎮 Callback de Steam recibido');

            // Verificar respuesta de OpenID
            const verification = await this.steamService.verifyOpenIdResponse(req.query);

            if (!verification.success) {
                return res.redirect(`/login?error=steam_auth_failed`);
            }

            const steamId = verification.steamId;
            console.log(`✅ Steam ID verificado: ${steamId}`);

            // Obtener datos completos del usuario
            const userData = await this.steamService.getCompleteUserData(steamId);

            if (!userData.success) {
                console.error('Error obteniendo datos de Steam:', userData.error);
                return res.redirect(`/login?error=steam_data_failed`);
            }

            // Aquí puedes guardar/actualizar el usuario en tu base de datos
            const user = await this.saveOrUpdateSteamUser(userData.data);

            // Crear sesión (usando tu sistema de autenticación)
            req.session.user = {
                id: user.id,
                steamId: steamId,
                nombre: userData.data.profile.displayName,
                rol: 'comprador', // Los usuarios de Steam son jugadores
                avatar: userData.data.profile.avatar,
                loginType: 'steam'
            };

            // Redirigir al dashboard con datos
            const redirectParams = new URLSearchParams({
                steam_return: 'true',
                success: 'true',
                steam_id: steamId,
                display_name: userData.data.profile.displayName,
                new_user: user.isNew ? 'true' : 'false'
            });

            res.redirect(`/dashboard-jugador?${redirectParams.toString()}`);

        } catch (error) {
            console.error('Error en callback de Steam:', error);
            res.redirect(`/login?error=steam_callback_failed`);
        }
    }

    /**
     * Obtener perfil del usuario por Steam ID
     * GET /api/steam/profile/:steamId
     */
    async getUserProfile(req, res) {
        try {
            const { steamId } = req.params;

            if (!steamId) {
                return res.status(400).json({
                    success: false,
                    message: 'Steam ID requerido'
                });
            }

            const profile = await this.steamService.getUserProfile(steamId);

            if (!profile.success) {
                return res.status(404).json(profile);
            }

            res.json(profile);

        } catch (error) {
            console.error('Error obteniendo perfil:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    /**
     * Obtener juegos del usuario
     * GET /api/steam/games/:steamId
     */
    async getUserGames(req, res) {
        try {
            const { steamId } = req.params;
            const { limit = 50, sortBy = 'playtime' } = req.query;

            const games = await this.steamService.getUserGames(steamId);

            if (!games.success) {
                return res.status(404).json(games);
            }

            // Aplicar filtros y ordenamiento
            let processedGames = games.data.games;

            // Ordenar
            if (sortBy === 'playtime') {
                processedGames.sort((a, b) => b.playtimeForever - a.playtimeForever);
            } else if (sortBy === 'recent') {
                processedGames.sort((a, b) => b.playtime2Weeks - a.playtime2Weeks);
            } else if (sortBy === 'name') {
                processedGames.sort((a, b) => a.name.localeCompare(b.name));
            }

            // Limitar resultados
            if (limit) {
                processedGames = processedGames.slice(0, parseInt(limit));
            }

            res.json({
                success: true,
                data: {
                    gameCount: games.data.gameCount,
                    games: processedGames,
                    totalPages: Math.ceil(games.data.gameCount / limit)
                }
            });

        } catch (error) {
            console.error('Error obteniendo juegos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener juegos'
            });
        }
    }

    /**
     * Obtener estadísticas de un juego específico
     * GET /api/steam/stats/:steamId/:appId
     */
    async getGameStats(req, res) {
        try {
            const { steamId, appId } = req.params;

            const stats = await this.steamService.getGameStats(steamId, appId);

            if (!stats.success) {
                return res.status(404).json(stats);
            }

            res.json(stats);

        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas'
            });
        }
    }

    /**
     * Obtener logros de un juego
     * GET /api/steam/achievements/:steamId/:appId
     */
    async getGameAchievements(req, res) {
        try {
            const { steamId, appId } = req.params;

            const achievements = await this.steamService.getUserAchievements(steamId, appId);

            if (!achievements.success) {
                return res.status(404).json(achievements);
            }

            res.json(achievements);

        } catch (error) {
            console.error('Error obteniendo logros:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener logros'
            });
        }
    }

    /**
     * Obtener resumen completo del usuario
     * GET /api/steam/summary/:steamId
     */
    async getUserSummary(req, res) {
        try {
            const { steamId } = req.params;

            const userData = await this.steamService.getCompleteUserData(steamId);

            if (!userData.success) {
                return res.status(404).json(userData);
            }

            // Agregar métricas adicionales
            const summary = {
                ...userData.data,
                insights: {
                    averageSessionTime: this.calculateAverageSession(userData.data.games.games),
                    gameGenres: await this.analyzeGameGenres(userData.data.games.games),
                    playingHabits: this.analyzePlayingHabits(userData.data.games.games),
                    recommendations: this.generateRecommendations(userData.data)
                }
            };

            res.json({
                success: true,
                data: summary
            });

        } catch (error) {
            console.error('Error obteniendo resumen:', error);
            res.status(500).json({
                success: false,
                message: 'Error al generar resumen'
            });
        }
    }

    /**
     * Guardar o actualizar usuario de Steam en la base de datos
     */
    async saveOrUpdateSteamUser(steamData) {
        try {
            // Aquí integrarías con tu modelo de usuarios existente
            // Ejemplo usando tu usuariosModel.js:

            /*
            const UsuariosModel = require('../models/usuariosModel');

            // Buscar si el usuario ya existe
            let user = await UsuariosModel.findBySteamId(steamData.profile.steamId);

            if (user) {
                // Actualizar datos existentes
                user = await UsuariosModel.updateSteamData(user.id, {
                    nombre: steamData.profile.displayName,
                    avatar: steamData.profile.avatar,
                    lastSteamUpdate: new Date(),
                    steamData: JSON.stringify(steamData)
                });

                return { ...user, isNew: false };
            } else {
                // Crear nuevo usuario
                user = await UsuariosModel.create({
                    nombre: steamData.profile.displayName,
                    usuario: `steam_${steamData.profile.steamId}`,
                    correo: null, // Steam no proporciona email
                    rol: 'comprador',
                    steamId: steamData.profile.steamId,
                    avatar: steamData.profile.avatar,
                    steamData: JSON.stringify(steamData),
                    createdAt: new Date()
                });

                return { ...user, isNew: true };
            }
            */

            // Simulación temporal
            return {
                id: Date.now(),
                steamId: steamData.profile.steamId,
                nombre: steamData.profile.displayName,
                isNew: Math.random() > 0.5 // Simular usuarios nuevos/existentes
            };

        } catch (error) {
            console.error('Error guardando usuario Steam:', error);
            throw error;
        }
    }

    /**
     * Métodos auxiliares para análisis de datos
     */
    calculateAverageSession(games) {
        if (!games || games.length === 0) return 0;

        const totalHours = games.reduce((sum, game) => sum + game.playtimeForever, 0);
        const totalGames = games.filter(game => game.playtimeForever > 0).length;

        return totalGames > 0 ? Math.round(totalHours / totalGames * 100) / 100 : 0;
    }

    async analyzeGameGenres(games) {
        // Simulación de análisis de géneros - en producción usarías Steam Store API
        const genres = ['Action', 'Adventure', 'Strategy', 'RPG', 'Simulation', 'Sports', 'Racing'];
        const genreDistribution = {};

        games.forEach(game => {
            // Asignar género aleatorio para simulación
            const genre = genres[Math.floor(Math.random() * genres.length)];
            genreDistribution[genre] = (genreDistribution[genre] || 0) + game.playtimeForever;
        });

        return Object.entries(genreDistribution)
            .map(([genre, hours]) => ({ genre, hours: Math.round(hours * 100) / 100 }))
            .sort((a, b) => b.hours - a.hours);
    }

    analyzePlayingHabits(games) {
        if (!games || games.length === 0) {
            return {
                totalGames: 0,
                activeGames: 0,
                averagePlaytime: 0,
                playingPattern: 'No data'
            };
        }

        const activeGames = games.filter(game => game.playtime2Weeks > 0);
        const totalPlaytime = games.reduce((sum, game) => sum + game.playtimeForever, 0);
        const averagePlaytime = totalPlaytime / games.length;

        let playingPattern = 'Casual'; // Por defecto

        if (averagePlaytime > 100) {
            playingPattern = 'Hardcore';
        } else if (averagePlaytime > 30) {
            playingPattern = 'Regular';
        } else if (activeGames.length > games.length * 0.3) {
            playingPattern = 'Variety Seeker';
        }

        return {
            totalGames: games.length,
            activeGames: activeGames.length,
            averagePlaytime: Math.round(averagePlaytime * 100) / 100,
            playingPattern,
            recentActivity: activeGames.reduce((sum, game) => sum + game.playtime2Weeks, 0)
        };
    }

    generateRecommendations(userData) {
        const recommendations = [];
        const stats = userData.stats;

        // Recomendación basada en tiempo de juego
        if (stats.totalPlaytime > 1000) {
            recommendations.push({
                type: 'time_management',
                title: 'Gestión del Tiempo',
                message: `Has jugado ${Math.round(stats.totalPlaytime)} horas. Considera establecer límites diarios.`,
                priority: 'high'
            });
        }

        // Recomendación basada en variedad
        if (stats.totalGames > 50 && stats.recentPlaytime < 10) {
            recommendations.push({
                type: 'game_variety',
                title: 'Explora tu Biblioteca',
                message: 'Tienes muchos juegos sin explorar. ¡Prueba algo nuevo!',
                priority: 'medium'
            });
        }

        // Recomendación de actividad reciente
        if (stats.recentPlaytime > 40) {
            recommendations.push({
                type: 'balance',
                title: 'Balance de Actividades',
                message: 'Has estado muy activo esta semana. Considera tomar descansos.',
                priority: 'medium'
            });
        }

        return recommendations;
    }

    /**
     * Webhook para actualizaciones de Steam (opcional)
     * POST /api/steam/webhook
     */
    async handleWebhook(req, res) {
        try {
            // Manejar actualizaciones automáticas de Steam si las configuras
            console.log('Webhook de Steam recibido:', req.body);

            res.status(200).json({ success: true });

        } catch (error) {
            console.error('Error en webhook:', error);
            res.status(500).json({ success: false });
        }
    }

    /**
     * Verificar estado de la API de Steam
     * GET /api/steam/health
     */
    async checkHealth(req, res) {
        try {
            // Hacer una llamada simple para verificar conectividad
            const testResult = await this.steamService.getUserProfile('76561197960434622'); // Gabe Newell's ID for testing

            res.json({
                success: true,
                apiStatus: testResult.success ? 'operational' : 'degraded',
                timestamp: new Date().toISOString(),
                apiKey: !!process.env.STEAM_API_KEY
            });

        } catch (error) {
            res.status(503).json({
                success: false,
                apiStatus: 'down',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Obtener estadísticas para el control parental
     * GET /api/steam/parental-stats/:steamId
     */
    async getParentalStats(req, res) {
        try {
            const { steamId } = req.params;
            const { period = '7d' } = req.query; // 7d, 30d, 90d

            const userData = await this.steamService.getCompleteUserData(steamId);

            if (!userData.success) {
                return res.status(404).json(userData);
            }

            // Generar estadísticas específicas para control parental
            const parentalStats = {
                period,
                totalPlaytime: userData.data.stats.totalPlaytime,
                recentPlaytime: userData.data.stats.recentPlaytime,
                dailyAverage: Math.round(userData.data.stats.recentPlaytime / 7 * 100) / 100,
                topGames: userData.data.stats.topGames?.slice(0, 3) || [],
                alerts: this.generateParentalAlerts(userData.data),
                recommendations: this.generateParentalRecommendations(userData.data),
                schedule: this.analyzePlayingSchedule(userData.data)
            };

            res.json({
                success: true,
                data: parentalStats
            });

        } catch (error) {
            console.error('Error obteniendo stats parentales:', error);
            res.status(500).json({
                success: false,
                message: 'Error al generar estadísticas parentales'
            });
        }
    }

    generateParentalAlerts(userData) {
        const alerts = [];
        const recentHours = userData.stats.recentPlaytime;
        const dailyAverage = recentHours / 7;

        if (dailyAverage > 8) {
            alerts.push({
                level: 'high',
                type: 'excessive_play',
                message: `Promedio diario de ${Math.round(dailyAverage * 100) / 100} horas excede lo recomendado`
            });
        }

        if (recentHours > 40) {
            alerts.push({
                level: 'medium',
                type: 'weekly_limit',
                message: 'Tiempo de juego semanal alto: ' + Math.round(recentHours) + ' horas'
            });
        }

        return alerts;
    }

    generateParentalRecommendations(userData) {
        const recommendations = [];

        recommendations.push({
            type: 'schedule',
            title: 'Establecer Horarios',
            description: 'Configura horarios específicos para gaming'
        });

        if (userData.stats.totalGames > 20) {
            recommendations.push({
                type: 'content',
                title: 'Revisar Contenido',
                description: 'Revisar la clasificación de edad de los juegos'
            });
        }

        return recommendations;
    }

    analyzePlayingSchedule(userData) {
        // Simulación de análisis de horarios - en producción usarías datos históricos
        return {
            preferredHours: ['19:00-22:00', '14:00-17:00'],
            weekdayPattern: 'Moderate',
            weekendPattern: 'High',
            lateNightSessions: Math.random() > 0.7
        };
    }
}

module.exports = SteamControlador;
// services/steamService.js
import fetch from 'node-fetch';

class SteamService {
    constructor() {
        this.apiKey = process.env.STEAM_API_KEY;
        this.baseUrl = 'https://api.steampowered.com';

        if (!this.apiKey) {
            console.warn('STEAM_API_KEY no está configurada en las variables de entorno');
        }
    }

    /**
     * Realizar petición a la API de Steam con manejo de errores
     */
    async makeRequest(endpoint, params = {}) {
        try {
            if (!this.apiKey) {
                throw new Error('Steam API Key no configurada');
            }

            // Agregar la API key a los parámetros
            const urlParams = new URLSearchParams({
                key: this.apiKey,
                format: 'json',
                ...params
            });

            const url = `${this.baseUrl}${endpoint}?${urlParams}`;
            console.log(`Llamando a Steam API: ${endpoint}`);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Steam API respondió con estado ${response.status}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Error en Steam API:', error.message);
            throw error;
        }
    }

    /**
     * Obtener información básica del jugador
     */
    async getPlayerSummary(steamId) {
        try {
            const data = await this.makeRequest('/ISteamUser/GetPlayerSummaries/v0002/', {
                steamids: steamId
            });

            if (!data.response || !data.response.players || data.response.players.length === 0) {
                throw new Error('Jugador no encontrado');
            }

            const player = data.response.players[0];

            return {
                steamid: player.steamid,
                personaname: player.personaname,
                profileurl: player.profileurl,
                avatar: player.avatar,
                avatarmedium: player.avatarmedium,
                avatarfull: player.avatarfull,
                personastate: player.personastate,
                communityvisibilitystate: player.communityvisibilitystate,
                profilestate: player.profilestate,
                lastlogoff: player.lastlogoff,
                commentpermission: player.commentpermission,
                realname: player.realname,
                primaryclanid: player.primaryclanid,
                timecreated: player.timecreated,
                gameid: player.gameid,
                gameserverip: player.gameserverip,
                gameextrainfo: player.gameextrainfo,
                cityid: player.cityid,
                loccountrycode: player.loccountrycode,
                locstatecode: player.locstatecode
            };

        } catch (error) {
            console.error('Error obteniendo resumen del jugador:', error);
            throw error;
        }
    }

    /**
     * Obtener lista de juegos del jugador
     */
    async getOwnedGames(steamId, includeAppInfo = true, includeFreeGames = true) {
        try {
            const data = await this.makeRequest('/IPlayerService/GetOwnedGames/v0001/', {
                steamid: steamId,
                include_appinfo: includeAppInfo ? 1 : 0,
                include_played_free_games: includeFreeGames ? 1 : 0
            });

            if (!data.response) {
                throw new Error('No se pudieron obtener los juegos');
            }

            const games = data.response.games || [];

            return {
                game_count: data.response.game_count || 0,
                games: games.map(game => ({
                    appid: game.appid,
                    name: game.name,
                    playtime_forever: game.playtime_forever || 0,
                    playtime_windows_forever: game.playtime_windows_forever || 0,
                    playtime_mac_forever: game.playtime_mac_forever || 0,
                    playtime_linux_forever: game.playtime_linux_forever || 0,
                    playtime_2weeks: game.playtime_2weeks || 0,
                    img_icon_url: game.img_icon_url,
                    img_logo_url: game.img_logo_url,
                    has_community_visible_stats: game.has_community_visible_stats
                }))
            };

        } catch (error) {
            console.error('Error obteniendo juegos:', error);
            throw error;
        }
    }

    /**
     * Obtener juegos jugados recientemente
     */
    async getRecentlyPlayedGames(steamId, count = 5) {
        try {
            const data = await this.makeRequest('/IPlayerService/GetRecentlyPlayedGames/v0001/', {
                steamid: steamId,
                count: count
            });

            if (!data.response) {
                return { total_count: 0, games: [] };
            }

            const games = data.response.games || [];

            return {
                total_count: data.response.total_count || 0,
                games: games.map(game => ({
                    appid: game.appid,
                    name: game.name,
                    playtime_2weeks: game.playtime_2weeks || 0,
                    playtime_forever: game.playtime_forever || 0,
                    img_icon_url: game.img_icon_url,
                    img_logo_url: game.img_logo_url
                }))
            };

        } catch (error) {
            console.error('Error obteniendo juegos recientes:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de un juego específico
     */
    async getPlayerStatsForGame(steamId, appId) {
        try {
            const data = await this.makeRequest('/ISteamUserStats/GetPlayerStatsForGame/v0002/', {
                steamid: steamId,
                appid: appId
            });

            if (!data.response) {
                throw new Error('No se pudieron obtener las estadísticas');
            }

            return {
                steamID: data.response.steamID,
                gameName: data.response.gameName,
                stats: data.response.stats || [],
                achievements: data.response.achievements || []
            };

        } catch (error) {
            console.error('Error obteniendo estadísticas del juego:', error);
            throw error;
        }
    }

    /**
     * Obtener logros de un juego
     */
    async getPlayerAchievements(steamId, appId) {
        try {
            const data = await this.makeRequest('/ISteamUserStats/GetPlayerAchievements/v0001/', {
                steamid: steamId,
                appid: appId,
                l: 'spanish'
            });

            if (!data.response) {
                throw new Error('No se pudieron obtener los logros');
            }

            return {
                steamID: data.response.steamID,
                gameName: data.response.gameName,
                achievements: data.response.achievements || [],
                success: data.response.success || false
            };

        } catch (error) {
            console.error('Error obteniendo logros:', error);
            throw error;
        }
    }

    /**
     * Obtener resumen completo del usuario
     */
    async getUserSummary(steamId) {
        try {
            const [profile, games, recentGames] = await Promise.all([
                this.getPlayerSummary(steamId),
                this.getOwnedGames(steamId),
                this.getRecentlyPlayedGames(steamId, 3)
            ]);

            // Calcular estadísticas
            const totalPlaytime = games.games.reduce((total, game) =>
                total + (game.playtime_forever || 0), 0
            );

            // Encontrar el juego más jugado
            const mostPlayedGame = games.games.reduce((prev, current) =>
                    (current.playtime_forever > prev.playtime_forever) ? current : prev,
                { playtime_forever: 0, name: 'Ninguno' }
            );

            return {
                profile,
                statistics: {
                    totalGames: games.game_count,
                    totalPlaytimeMinutes: totalPlaytime,
                    totalPlaytimeHours: Math.round(totalPlaytime / 60),
                    mostPlayedGame: {
                        name: mostPlayedGame.name || 'Ninguno',
                        playtime: mostPlayedGame.playtime_forever || 0,
                        playtimeHours: Math.round((mostPlayedGame.playtime_forever || 0) / 60)
                    }
                },
                recentGames: recentGames.games,
                topGames: games.games
                    .sort((a, b) => b.playtime_forever - a.playtime_forever)
                    .slice(0, 5)
            };

        } catch (error) {
            console.error('Error obteniendo resumen completo:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas para control parental
     */
    async getParentalStats(steamId) {
        try {
            const [games, recentGames] = await Promise.all([
                this.getOwnedGames(steamId),
                this.getRecentlyPlayedGames(steamId, 10)
            ]);

            // Calcular tiempo jugado en las últimas 2 semanas
            const recentPlaytime = recentGames.games.reduce((total, game) =>
                total + (game.playtime_2weeks || 0), 0
            );

            // Juegos por categoría de tiempo
            const gamesByPlaytime = {
                intensive: games.games.filter(game => game.playtime_forever > 6000), // +100 horas
                moderate: games.games.filter(game => game.playtime_forever > 600 && game.playtime_forever <= 6000), // 10-100 horas
                casual: games.games.filter(game => game.playtime_forever <= 600) // -10 horas
            };

            return {
                totalGames: games.game_count,
                recentPlaytimeMinutes: recentPlaytime,
                recentPlaytimeHours: Math.round(recentPlaytime / 60),
                dailyAverageHours: Math.round((recentPlaytime / 60) / 14 * 100) / 100,
                gameCategories: {
                    intensive: gamesByPlaytime.intensive.length,
                    moderate: gamesByPlaytime.moderate.length,
                    casual: gamesByPlaytime.casual.length
                },
                recentGames: recentGames.games.map(game => ({
                    name: game.name,
                    playtime_2weeks_hours: Math.round((game.playtime_2weeks || 0) / 60),
                    playtime_forever_hours: Math.round((game.playtime_forever || 0) / 60)
                })),
                recommendations: this.generateParentalRecommendations(recentPlaytime, games.game_count)
            };

        } catch (error) {
            console.error('Error obteniendo estadísticas parentales:', error);
            throw error;
        }
    }

    /**
     * Generar recomendaciones parentales
     */
    generateParentalRecommendations(recentPlaytimeMinutes, totalGames) {
        const hoursPerDay = (recentPlaytimeMinutes / 60) / 14;
        const recommendations = [];

        if (hoursPerDay > 4) {
            recommendations.push({
                type: 'warning',
                message: 'Tiempo de juego elevado (>4h/día). Considere establecer límites.'
            });
        } else if (hoursPerDay > 2) {
            recommendations.push({
                type: 'caution',
                message: 'Tiempo de juego moderado-alto. Monitorear actividad.'
            });
        } else {
            recommendations.push({
                type: 'good',
                message: 'Tiempo de juego dentro de rangos saludables.'
            });
        }

        if (totalGames > 100) {
            recommendations.push({
                type: 'info',
                message: 'Gran biblioteca de juegos. Verificar contenido apropiado para la edad.'
            });
        }

        return recommendations;
    }

    /**
     * Verificar estado de la API de Steam
     */
    async checkApiHealth() {
        try {
            // Hacemos una petición simple para verificar conectividad
            const response = await fetch(`${this.baseUrl}/ISteamWebAPIUtil/GetServerInfo/v0001/?key=${this.apiKey}`);

            return {
                status: response.ok ? 'healthy' : 'unhealthy',
                responseTime: Date.now(),
                apiKeyConfigured: !!this.apiKey
            };

        } catch (error) {
            console.error('Error verificando salud de Steam API:', error);
            return {
                status: 'unhealthy',
                error: error.message,
                apiKeyConfigured: !!this.apiKey
            };
        }
    }
}

export default SteamService;
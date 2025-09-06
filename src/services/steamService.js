// /services/steamService.js
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
     * Realizar petición a la API de Steam con manejo de errores mejorado
     */
    async makeRequest(endpoint, params = {}, retries = 3) {
        try {
            if (!this.apiKey) {
                throw new Error('Steam API Key no configurada');
            }

            // Limpiar la API key de espacios en blanco
            const cleanApiKey = this.apiKey.trim();

            // Agregar la API key a los parámetros
            const urlParams = new URLSearchParams({
                key: cleanApiKey,
                format: 'json',
                ...params
            });

            const url = `${this.baseUrl}${endpoint}?${urlParams}`;
            console.log(`Llamando a Steam API: ${endpoint} con params:`, params);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'SafePlay/1.0',
                    'Accept': 'application/json'
                },
                timeout: 10000 // 10 segundos timeout
            });

            console.log(`Steam API Response Status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'No error details');
                console.error(`Steam API Error Response: ${response.status} - ${errorText}`);

                if (response.status === 401) {
                    throw new Error('Steam API Key inválida o no autorizada');
                } else if (response.status === 403) {
                    throw new Error('Acceso denegado - Perfil privado o datos no disponibles');
                } else if (response.status === 429) {
                    throw new Error('Límite de solicitudes excedido');
                } else if (response.status === 500) {
                    throw new Error('Error interno del servidor de Steam');
                } else {
                    throw new Error(`Steam API respondió con estado ${response.status}: ${errorText}`);
                }
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Steam API no devolvió JSON:', text);
                throw new Error('Respuesta inválida de Steam API (no es JSON)');
            }

            const data = await response.json();
            console.log('Steam API Response received successfully');
            return data;

        } catch (error) {
            console.error('Error en Steam API:', error.message);

            // Reintentar en caso de errores de red
            if (retries > 0 && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) {
                console.log(`Reintentando petición a Steam API... (${retries} intentos restantes)`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
                return this.makeRequest(endpoint, params, retries - 1);
            }

            throw error;
        }
    }

    /**
     * Obtener información básica del jugador
     */
    async getPlayerSummary(steamId) {
        try {
            console.log(`Obteniendo perfil para Steam ID: ${steamId}`);

            // Validar que el Steam ID tenga el formato correcto
            if (!steamId || !/^\d{17}$/.test(steamId)) {
                throw new Error('Steam ID inválido - debe ser un número de 17 dígitos');
            }

            const data = await this.makeRequest('/ISteamUser/GetPlayerSummaries/v0002/', {
                steamids: steamId
            });

            if (!data.response) {
                throw new Error('Respuesta inválida de Steam API');
            }

            if (!data.response.players || data.response.players.length === 0) {
                throw new Error('Jugador no encontrado o perfil no disponible');
            }

            const player = data.response.players[0];

            return {
                steamid: player.steamid,
                personaname: player.personaname || 'Usuario Steam',
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
            console.log(`Obteniendo juegos para Steam ID: ${steamId}`);

            // Validar Steam ID
            if (!steamId || !/^\d{17}$/.test(steamId)) {
                throw new Error('Steam ID inválido - debe ser un número de 17 dígitos');
            }

            const data = await this.makeRequest('/IPlayerService/GetOwnedGames/v0001/', {
                steamid: steamId,
                include_appinfo: includeAppInfo ? 1 : 0,
                include_played_free_games: includeFreeGames ? 1 : 0
            });

            if (!data.response) {
                throw new Error('No se pudieron obtener los juegos - respuesta inválida');
            }

            // Si no hay juegos, podría ser porque el perfil es privado
            const games = data.response.games || [];

            if (games.length === 0 && data.response.game_count === undefined) {
                throw new Error('Lista de juegos no disponible - el perfil podría ser privado');
            }

            return {
                game_count: data.response.game_count || 0,
                games: games.map(game => ({
                    appid: game.appid,
                    name: game.name || `Juego ${game.appid}`,
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
            console.log(`Obteniendo juegos recientes para Steam ID: ${steamId}`);

            // Validar Steam ID
            if (!steamId || !/^\d{17}$/.test(steamId)) {
                throw new Error('Steam ID inválido - debe ser un número de 17 dígitos');
            }

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
                    name: game.name || `Juego ${game.appid}`,
                    playtime_2weeks: game.playtime_2weeks || 0,
                    playtime_forever: game.playtime_forever || 0,
                    img_icon_url: game.img_icon_url,
                    img_logo_url: game.img_logo_url
                }))
            };

        } catch (error) {
            console.error('Error obteniendo juegos recientes:', error);
            // No lanzar error aquí, devolver datos vacíos
            return { total_count: 0, games: [] };
        }
    }

    /**
     * Obtener resumen completo del usuario (adaptado para tu HTML existente)
     */
    async getUserSummary(steamId) {
        try {
            console.log(`Obteniendo resumen completo para Steam ID: ${steamId}`);

            // Validar Steam ID
            if (!steamId || !/^\d{17}$/.test(steamId)) {
                throw new Error('Steam ID inválido - debe ser un número de 17 dígitos');
            }

            // Obtener datos en paralelo, pero manejar errores individualmente
            const [profileResult, gamesResult, recentGamesResult] = await Promise.allSettled([
                this.getPlayerSummary(steamId),
                this.getOwnedGames(steamId),
                this.getRecentlyPlayedGames(steamId, 3)
            ]);

            // Verificar que al menos el perfil se obtuvo correctamente
            if (profileResult.status !== 'fulfilled') {
                throw new Error('No se pudo obtener el perfil del usuario: ' + profileResult.reason?.message);
            }

            const profile = profileResult.value;
            const games = gamesResult.status === 'fulfilled' ? gamesResult.value : { game_count: 0, games: [] };
            const recentGames = recentGamesResult.status === 'fulfilled' ? recentGamesResult.value : { total_count: 0, games: [] };

            // Calcular estadísticas
            const totalPlaytime = games.games.reduce((total, game) =>
                total + (game.playtime_forever || 0), 0
            );

            // Encontrar el juego más jugado
            const mostPlayedGame = games.games.length > 0
                ? games.games.reduce((prev, current) =>
                        (current.playtime_forever > prev.playtime_forever) ? current : prev,
                    { playtime_forever: 0, name: 'Ninguno' }
                )
                : { playtime_forever: 0, name: 'Ninguno' };

            // Formato adaptado a tu HTML existente
            return {
                // Para compatibilidad con tu HTML actual
                displayName: profile.personaname,
                avatar: profile.avatarfull || profile.avatarmedium || profile.avatar,
                games: games.games,

                // Datos adicionales
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
     * Obtener estadísticas de un juego específico
     */
    async getPlayerStatsForGame(steamId, appId) {
        try {
            console.log(`Obteniendo estadísticas para Steam ID: ${steamId}, App ID: ${appId}`);

            // Validar parámetros
            if (!steamId || !/^\d{17}$/.test(steamId)) {
                throw new Error('Steam ID inválido - debe ser un número de 17 dígitos');
            }

            if (!appId || isNaN(parseInt(appId))) {
                throw new Error('App ID inválido');
            }

            const data = await this.makeRequest('/ISteamUserStats/GetUserStatsForGame/v0002/', {
                steamid: steamId,
                appid: appId
            });

            if (!data.response) {
                throw new Error('No se pudieron obtener las estadísticas');
            }

            return {
                steamID: data.response.steamID,
                gameName: data.response.gameName || `Juego ${appId}`,
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
            console.log(`Obteniendo logros para Steam ID: ${steamId}, App ID: ${appId}`);

            // Validar parámetros
            if (!steamId || !/^\d{17}$/.test(steamId)) {
                throw new Error('Steam ID inválido - debe ser un número de 17 dígitos');
            }

            if (!appId || isNaN(parseInt(appId))) {
                throw new Error('App ID inválido');
            }

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
                gameName: data.response.gameName || `Juego ${appId}`,
                achievements: data.response.achievements || [],
                success: data.response.success || false
            };

        } catch (error) {
            console.error('Error obteniendo logros:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas para control parental
     */
    async getParentalStats(steamId) {
        try {
            console.log(`Obteniendo estadísticas parentales para Steam ID: ${steamId}`);

            // Validar Steam ID
            if (!steamId || !/^\d{17}$/.test(steamId)) {
                throw new Error('Steam ID inválido - debe ser un número de 17 dígitos');
            }

            const [gamesResult, recentGamesResult] = await Promise.allSettled([
                this.getOwnedGames(steamId),
                this.getRecentlyPlayedGames(steamId, 10)
            ]);

            const games = gamesResult.status === 'fulfilled' ? gamesResult.value : { game_count: 0, games: [] };
            const recentGames = recentGamesResult.status === 'fulfilled' ? recentGamesResult.value : { total_count: 0, games: [] };

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
            console.log('Verificando salud de Steam API...');

            if (!this.apiKey) {
                return {
                    status: 'unhealthy',
                    error: 'API Key no configurada',
                    apiKeyConfigured: false
                };
            }

            // Hacemos una petición simple para verificar conectividad
            // Usamos un Steam ID público conocido para la prueba
            const testSteamId = '76561197960435530'; // Steam ID de prueba público

            const startTime = Date.now();
            await this.makeRequest('/ISteamUser/GetPlayerSummaries/v0002/', {
                steamids: testSteamId
            });
            const responseTime = Date.now() - startTime;

            return {
                status: 'healthy',
                responseTime: responseTime,
                apiKeyConfigured: true
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

    /**
     * Convertir Steam ID de diferentes formatos
     */
    convertSteamId(input) {
        try {
            // Si ya es un Steam ID de 64 bits, devolverlo
            if (/^\d{17}$/.test(input)) {
                return input;
            }

            // Si es un Steam ID de 32 bits, convertirlo
            if (/^\d{8,10}$/.test(input)) {
                const steamId64 = BigInt(input) + BigInt('76561197960265728');
                return steamId64.toString();
            }

            // Si es formato STEAM_X:Y:Z, convertirlo
            const steamIdMatch = input.match(/^STEAM_([0-5]):([01]):(\d+)$/);
            if (steamIdMatch) {
                const [, , y, z] = steamIdMatch;
                const steamId64 = BigInt(z) * BigInt(2) + BigInt(y) + BigInt('76561197960265728');
                return steamId64.toString();
            }

            throw new Error('Formato de Steam ID no reconocido');

        } catch (error) {
            console.error('Error convirtiendo Steam ID:', error);
            throw new Error('No se pudo convertir el Steam ID proporcionado');
        }
    }

    /**
     * Extraer Steam ID de una URL de perfil de Steam
     */
    extractSteamIdFromUrl(url) {
        try {
            // Steam ID directo en URL
            const steamId64Match = url.match(/\/profiles\/(\d{17})/);
            if (steamId64Match) {
                return steamId64Match[1];
            }

            // URL personalizada - esto requeriría otra llamada a la API
            const customUrlMatch = url.match(/\/id\/([^\/]+)/);
            if (customUrlMatch) {
                throw new Error('URLs personalizadas de Steam no están soportadas actualmente. Use el Steam ID de 64 bits.');
            }

            throw new Error('URL de Steam no válida');

        } catch (error) {
            console.error('Error extrayendo Steam ID de URL:', error);
            throw error;
        }
    }
}

export default SteamService;
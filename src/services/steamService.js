// services/steamService.js - Servicio para integración con Steam API

const axios = require('axios');
const crypto = require('crypto');

class SteamService {
    constructor() {
        this.apiKey = process.env.STEAM_API_KEY;
        this.baseUrl = 'https://api.steampowered.com';
        this.steamOpenIdUrl = 'https://steamcommunity.com/openid/login';
        this.realm = process.env.APP_URL || 'http://localhost:3000';
        this.returnUrl = `${this.realm}/api/steam/callback`;

        if (!this.apiKey) {
            console.warn('⚠️  STEAM_API_KEY no encontrada en variables de entorno');
        }
    }

    /**
     * Generar URL de autorización de Steam OpenID
     */
    generateAuthUrl() {
        const params = new URLSearchParams({
            'openid.ns': 'http://specs.openid.net/auth/2.0',
            'openid.mode': 'checkid_setup',
            'openid.return_to': this.returnUrl,
            'openid.realm': this.realm,
            'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
            'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
        });

        return `${this.steamOpenIdUrl}?${params.toString()}`;
    }

    /**
     * Verificar respuesta de Steam OpenID
     */
    async verifyOpenIdResponse(query) {
        try {
            const params = new URLSearchParams();

            // Copiar todos los parámetros recibidos
            for (const [key, value] of Object.entries(query)) {
                params.append(key, value);
            }

            // Cambiar el mode a check_authentication
            params.set('openid.mode', 'check_authentication');

            const response = await axios.post(this.steamOpenIdUrl, params.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (response.data.includes('is_valid:true')) {
                // Extraer Steam ID de la identity URL
                const steamId = this.extractSteamId(query['openid.identity']);
                return {
                    success: true,
                    steamId: steamId
                };
            }

            return {
                success: false,
                error: 'Verificación de Steam falló'
            };

        } catch (error) {
            console.error('Error verificando OpenID:', error);
            return {
                success: false,
                error: 'Error de verificación'
            };
        }
    }

    /**
     * Extraer Steam ID de la URL de identidad
     */
    extractSteamId(identityUrl) {
        const matches = identityUrl.match(/\/id\/(\d+)/);
        return matches ? matches[1] : null;
    }

    /**
     * Obtener información del perfil del usuario
     * API: ISteamUser/GetPlayerSummaries/v0002/
     */
    async getUserProfile(steamId) {
        try {
            if (!this.apiKey) {
                throw new Error('Steam API key no configurada');
            }

            const url = `${this.baseUrl}/ISteamUser/GetPlayerSummaries/v0002/`;
            const response = await axios.get(url, {
                params: {
                    key: this.apiKey,
                    steamids: steamId
                }
            });

            const players = response.data.response.players;

            if (players && players.length > 0) {
                const player = players[0];
                return {
                    success: true,
                    data: {
                        steamId: player.steamid,
                        displayName: player.personaname,
                        profileUrl: player.profileurl,
                        avatar: player.avatarfull,
                        realName: player.realname || null,
                        country: player.loccountrycode || null,
                        timeCreated: player.timecreated || null,
                        personaState: player.personastate, // 0=Offline, 1=Online, etc.
                        communityVisibilityState: player.communityvisibilitystate
                    }
                };
            }

            return {
                success: false,
                error: 'Usuario no encontrado'
            };

        } catch (error) {
            console.error('Error obteniendo perfil:', error);
            return {
                success: false,
                error: 'Error al obtener datos del perfil'
            };
        }
    }

    /**
     * Obtener juegos del usuario
     * API: IPlayerService/GetOwnedGames/v0001/
     */
    async getUserGames(steamId) {
        try {
            if (!this.apiKey) {
                throw new Error('Steam API key no configurada');
            }

            const url = `${this.baseUrl}/IPlayerService/GetOwnedGames/v0001/`;
            const response = await axios.get(url, {
                params: {
                    key: this.apiKey,
                    steamid: steamId,
                    format: 'json',
                    include_appinfo: true,
                    include_played_free_games: true
                }
            });

            const gamesData = response.data.response;

            if (gamesData && gamesData.games) {
                return {
                    success: true,
                    data: {
                        gameCount: gamesData.game_count,
                        games: gamesData.games.map(game => ({
                            appId: game.appid,
                            name: game.name,
                            playtimeForever: Math.round(game.playtime_forever / 60 * 100) / 100, // Convertir a horas
                            playtime2Weeks: game.playtime_2weeks ? Math.round(game.playtime_2weeks / 60 * 100) / 100 : 0,
                            iconUrl: game.img_icon_url ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg` : null,
                            logoUrl: game.img_logo_url ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_logo_url}.jpg` : null
                        }))
                    }
                };
            }

            return {
                success: false,
                error: 'No se encontraron juegos'
            };

        } catch (error) {
            console.error('Error obteniendo juegos:', error);
            return {
                success: false,
                error: 'Error al obtener lista de juegos'
            };
        }
    }

    /**
     * Obtener estadísticas de un juego específico
     * API: ISteamUserStats/GetUserStatsForGame/v0002/
     */
    async getGameStats(steamId, appId) {
        try {
            if (!this.apiKey) {
                throw new Error('Steam API key no configurada');
            }

            const url = `${this.baseUrl}/ISteamUserStats/GetUserStatsForGame/v0002/`;
            const response = await axios.get(url, {
                params: {
                    appid: appId,
                    key: this.apiKey,
                    steamid: steamId
                }
            });

            const statsData = response.data.playerstats;

            if (statsData && statsData.stats) {
                return {
                    success: true,
                    data: {
                        steamId: statsData.steamID,
                        gameName: statsData.gameName,
                        stats: statsData.stats,
                        achievements: statsData.achievements || []
                    }
                };
            }

            return {
                success: false,
                error: 'Estadísticas no disponibles para este juego'
            };

        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return {
                success: false,
                error: 'Error al obtener estadísticas del juego'
            };
        }
    }

    /**
     * Obtener logros del usuario para un juego
     * API: ISteamUserStats/GetPlayerAchievements/v0001/
     */
    async getUserAchievements(steamId, appId) {
        try {
            if (!this.apiKey) {
                throw new Error('Steam API key no configurada');
            }

            const url = `${this.baseUrl}/ISteamUserStats/GetPlayerAchievements/v0001/`;
            const response = await axios.get(url, {
                params: {
                    appid: appId,
                    key: this.apiKey,
                    steamid: steamId,
                    l: 'spanish' // Idioma
                }
            });

            const achievementsData = response.data.playerstats;

            if (achievementsData && achievementsData.achievements) {
                return {
                    success: true,
                    data: {
                        steamId: achievementsData.steamID,
                        gameName: achievementsData.gameName,
                        achievements: achievementsData.achievements.map(achievement => ({
                            apiName: achievement.apiname,
                            achieved: achievement.achieved,
                            unlockTime: achievement.unlocktime,
                            name: achievement.name,
                            description: achievement.description
                        }))
                    }
                };
            }

            return {
                success: false,
                error: 'Logros no disponibles'
            };

        } catch (error) {
            console.error('Error obteniendo logros:', error);
            return {
                success: false,
                error: 'Error al obtener logros'
            };
        }
    }

    /**
     * Obtener estadísticas globales de un juego
     * API: ISteamUserStats/GetGlobalStatsForGame/v0001/
     */
    async getGlobalGameStats(appId, statNames) {
        try {
            if (!this.apiKey) {
                throw new Error('Steam API key no configurada');
            }

            const url = `${this.baseUrl}/ISteamUserStats/GetGlobalStatsForGame/v0001/`;
            const response = await axios.get(url, {
                params: {
                    appid: appId,
                    count: statNames.length,
                    'name[0]': statNames[0] // Formato específico de Steam API
                }
            });

            return {
                success: true,
                data: response.data.response.globalstats
            };

        } catch (error) {
            console.error('Error obteniendo estadísticas globales:', error);
            return {
                success: false,
                error: 'Error al obtener estadísticas globales'
            };
        }
    }

    /**
     * Procesar y formatear datos completos del usuario
     */
    async getCompleteUserData(steamId) {
        try {
            console.log(`📊 Obteniendo datos completos para Steam ID: ${steamId}`);

            // Obtener perfil y juegos en paralelo
            const [profileResult, gamesResult] = await Promise.all([
                this.getUserProfile(steamId),
                this.getUserGames(steamId)
            ]);

            if (!profileResult.success) {
                return profileResult;
            }

            const userData = {
                profile: profileResult.data,
                games: gamesResult.success ? gamesResult.data : { gameCount: 0, games: [] },
                stats: {
                    totalGames: gamesResult.success ? gamesResult.data.gameCount : 0,
                    totalPlaytime: 0,
                    recentPlaytime: 0,
                    mostPlayedGame: null
                }
            };

            // Calcular estadísticas adicionales
            if (gamesResult.success && gamesResult.data.games.length > 0) {
                const games = gamesResult.data.games;

                // Tiempo total y reciente
                userData.stats.totalPlaytime = games.reduce((total, game) => total + game.playtimeForever, 0);
                userData.stats.recentPlaytime = games.reduce((total, game) => total + game.playtime2Weeks, 0);

                // Juego más jugado
                const mostPlayed = games.reduce((prev, current) =>
                    (prev.playtimeForever > current.playtimeForever) ? prev : current
                );
                userData.stats.mostPlayedGame = mostPlayed;

                // Top 5 juegos más jugados
                userData.stats.topGames = games
                    .sort((a, b) => b.playtimeForever - a.playtimeForever)
                    .slice(0, 5);
            }

            return {
                success: true,
                data: userData
            };

        } catch (error) {
            console.error('Error obteniendo datos completos:', error);
            return {
                success: false,
                error: 'Error al procesar datos del usuario'
            };
        }
    }
}

module.exports = SteamService;
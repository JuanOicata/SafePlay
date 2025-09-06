// controladores/steamControlador.js - Versión corregida
import SteamService from '../src/services/steamService.js';

class SteamControlador {
    constructor() {
        this.steamService = new SteamService();
    }

    // Obtener URL de autenticación de Steam
    getAuthUrl(req, res) {
        try {
            console.log('🔗 Generando URL de autenticación Steam...');

            // Para autenticación de Steam, redirigemos a la ruta de Passport
            const baseUrl = req.protocol + '://' + req.get('host');
            const authUrl = `${baseUrl}/auth/steam`;

            console.log('✅ URL generada:', authUrl);

            res.json({
                success: true,
                url: authUrl
            });
        } catch (error) {
            console.error('❌ Error generando URL Steam:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando URL de autenticación'
            });
        }
    }

    // Manejar callback de Steam
    handleCallback(req, res) {
        try {
            console.log('🔄 Procesando callback de Steam...');

            // Este método será manejado principalmente por Passport
            res.json({
                success: true,
                message: 'Callback procesado correctamente'
            });
        } catch (error) {
            console.error('❌ Error en callback Steam:', error);
            res.status(500).json({
                success: false,
                message: 'Error procesando callback de Steam'
            });
        }
    }

    // Obtener perfil del usuario - VERSIÓN MEJORADA
    async getUserProfile(req, res) {
        try {
            let steamId = req.params.steamId;

            console.log('👤 Obteniendo perfil de usuario...');
            console.log('🆔 Steam ID desde params:', steamId);
            console.log('🔍 Query params:', req.query);
            console.log('👥 Usuario en sesión:', req.session?.user);
            console.log('🌍 Headers relevantes:', {
                'user-agent': req.get('user-agent'),
                'accept': req.get('accept'),
                'content-type': req.get('content-type')
            });

            // Si no hay steamId en params, intentar obtenerlo de diferentes fuentes
            if (!steamId) {
                steamId = req.query.steam_id || req.user?.steamId || req.session?.user?.steamId;
                console.log('🔄 Steam ID alternativo encontrado:', steamId);
            }

            if (!steamId) {
                console.log('❌ No se pudo obtener Steam ID');
                return res.status(400).json({
                    success: false,
                    message: 'Steam ID requerido',
                    debug: {
                        params: req.params,
                        query: req.query,
                        session: req.session?.user ? 'exists' : 'missing'
                    }
                });
            }

            console.log(`🎮 Procesando perfil para Steam ID: ${steamId}`);

            // Verificar que el Steam ID tenga el formato correcto
            if (!/^\d{17}$/.test(steamId)) {
                console.log('❌ Formato de Steam ID inválido:', steamId);
                return res.status(400).json({
                    success: false,
                    message: 'Formato de Steam ID inválido - debe ser 17 dígitos',
                    provided: steamId
                });
            }

            console.log('📡 Llamando a Steam Service...');
            const profile = await this.steamService.getPlayerSummary(steamId);
            console.log('✅ Perfil obtenido exitosamente');

            res.json({
                success: true,
                data: profile,
                debug: {
                    steamId: steamId,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Error obteniendo perfil:', error);
            console.error('📍 Stack trace:', error.stack);

            // Manejo específico de errores
            let statusCode = 500;
            let message = 'Error obteniendo perfil del usuario';

            if (error.message.includes('Steam API Key')) {
                statusCode = 500;
                message = 'Configuración de Steam API incompleta';
            } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
                statusCode = 403;
                message = 'Perfil privado o no disponible';
            } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                statusCode = 401;
                message = 'Clave API de Steam inválida o expirada';
            } else if (error.message.includes('no encontrado')) {
                statusCode = 404;
                message = 'Usuario de Steam no encontrado';
            }

            res.status(statusCode).json({
                success: false,
                message: message,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                debug: process.env.NODE_ENV === 'development' ? {
                    steamId: req.params.steamId,
                    errorType: error.constructor.name,
                    timestamp: new Date().toISOString()
                } : undefined
            });
        }
    }

    // Obtener juegos del usuario - VERSIÓN MEJORADA
    async getUserGames(req, res) {
        try {
            let steamId = req.params.steamId;

            console.log('🎮 Obteniendo juegos del usuario...');

            if (!steamId) {
                steamId = req.query.steam_id || req.user?.steamId || req.session?.user?.steamId;
            }

            if (!steamId) {
                return res.status(400).json({
                    success: false,
                    message: 'Steam ID requerido'
                });
            }

            const { limit, sortBy } = req.query;

            console.log(`📋 Obteniendo juegos para Steam ID: ${steamId}`);
            console.log(`🔧 Parámetros: limit=${limit}, sortBy=${sortBy}`);

            // Verificar formato del Steam ID
            if (!/^\d{17}$/.test(steamId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de Steam ID inválido'
                });
            }

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

            console.log(`✅ ${games.length} juegos obtenidos exitosamente`);

            res.json({
                success: true,
                data: {
                    total_count: gamesData.game_count,
                    returned_count: games.length,
                    games: games
                }
            });

        } catch (error) {
            console.error('❌ Error obteniendo juegos:', error);

            let statusCode = 500;
            let message = 'Error obteniendo juegos del usuario';

            if (error.message.includes('Steam API Key')) {
                statusCode = 500;
                message = 'Configuración de Steam API incompleta';
            } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
                statusCode = 403;
                message = 'Lista de juegos privada o no disponible';
            } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                statusCode = 401;
                message = 'Clave API de Steam inválida';
            }

            res.status(statusCode).json({
                success: false,
                message: message,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Obtener resumen del usuario - VERSIÓN MEJORADA
    async getUserSummary(req, res) {
        try {
            let steamId = req.params.steamId;

            console.log('📊 Obteniendo resumen completo...');

            if (!steamId) {
                steamId = req.query.steam_id || req.user?.steamId || req.session?.user?.steamId;
            }

            if (!steamId) {
                return res.status(400).json({
                    success: false,
                    message: 'Steam ID requerido'
                });
            }

            console.log(`📈 Obteniendo resumen completo para Steam ID: ${steamId}`);

            // Verificar formato del Steam ID
            if (!/^\d{17}$/.test(steamId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de Steam ID inválido'
                });
            }

            const summary = await this.steamService.getUserSummary(steamId);

            console.log('✅ Resumen obtenido exitosamente');

            res.json({
                success: true,
                data: summary
            });

        } catch (error) {
            console.error('❌ Error obteniendo resumen:', error);

            let statusCode = 500;
            let message = 'Error obteniendo resumen del usuario';

            if (error.message.includes('Steam API Key')) {
                statusCode = 500;
                message = 'Configuración de Steam API incompleta';
            } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
                statusCode = 403;
                message = 'Datos del usuario no disponibles (perfil privado)';
            } else if (error.message.includes('401')) {
                statusCode = 401;
                message = 'Clave API de Steam inválida';
            }

            res.status(statusCode).json({
                success: false,
                message: message,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Obtener estadísticas de juego
    async getGameStats(req, res) {
        try {
            let steamId = req.params.steamId;
            const { appId } = req.params;

            if (!steamId) {
                steamId = req.query.steam_id || req.user?.steamId || req.session?.user?.steamId;
            }

            if (!steamId || !appId) {
                return res.status(400).json({
                    success: false,
                    message: 'Steam ID y App ID requeridos'
                });
            }

            console.log(`📊 Obteniendo estadísticas para Steam ID: ${steamId}, App ID: ${appId}`);

            // Verificar formato del Steam ID
            if (!/^\d{17}$/.test(steamId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de Steam ID inválido'
                });
            }

            const stats = await this.steamService.getPlayerStatsForGame(steamId, appId);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);

            let statusCode = 500;
            let message = 'Error obteniendo estadísticas del juego';

            if (error.message.includes('Steam API Key')) {
                statusCode = 500;
                message = 'Configuración de Steam API incompleta';
            } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
                statusCode = 403;
                message = 'Estadísticas no disponibles (perfil privado)';
            }

            res.status(statusCode).json({
                success: false,
                message: message,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Obtener logros del juego
    async getGameAchievements(req, res) {
        try {
            let steamId = req.params.steamId;
            const { appId } = req.params;

            if (!steamId) {
                steamId = req.query.steam_id || req.user?.steamId || req.session?.user?.steamId;
            }

            if (!steamId || !appId) {
                return res.status(400).json({
                    success: false,
                    message: 'Steam ID y App ID requeridos'
                });
            }

            console.log(`🏆 Obteniendo logros para Steam ID: ${steamId}, App ID: ${appId}`);

            // Verificar formato del Steam ID
            if (!/^\d{17}$/.test(steamId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de Steam ID inválido'
                });
            }

            const achievements = await this.steamService.getPlayerAchievements(steamId, appId);

            res.json({
                success: true,
                data: achievements
            });

        } catch (error) {
            console.error('❌ Error obteniendo logros:', error);

            let statusCode = 500;
            let message = 'Error obteniendo logros del juego';

            if (error.message.includes('Steam API Key')) {
                statusCode = 500;
                message = 'Configuración de Steam API incompleta';
            } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
                statusCode = 403;
                message = 'Logros no disponibles (perfil privado)';
            }

            res.status(statusCode).json({
                success: false,
                message: message,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Resto de métodos mantienen la misma lógica...
    async getParentalStats(req, res) {
        try {
            let steamId = req.params.steamId;

            if (!steamId) {
                steamId = req.query.steam_id || req.user?.steamId || req.session?.user?.steamId;
            }

            if (!steamId) {
                return res.status(400).json({
                    success: false,
                    message: 'Steam ID requerido'
                });
            }

            console.log(`👨‍👩‍👧‍👦 Obteniendo estadísticas parentales para Steam ID: ${steamId}`);

            if (!/^\d{17}$/.test(steamId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de Steam ID inválido'
                });
            }

            const parentalStats = await this.steamService.getParentalStats(steamId);

            res.json({
                success: true,
                data: parentalStats
            });

        } catch (error) {
            console.error('❌ Error obteniendo estadísticas parentales:', error);

            let statusCode = 500;
            let message = 'Error obteniendo estadísticas parentales';

            if (error.message.includes('Steam API Key')) {
                statusCode = 500;
                message = 'Configuración de Steam API incompleta';
            } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
                statusCode = 403;
                message = 'Datos no disponibles (perfil privado)';
            }

            res.status(statusCode).json({
                success: false,
                message: message,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Verificar salud de la API
    async checkHealth(req, res) {
        try {
            console.log('🏥 Verificando salud de Steam API...');
            const health = await this.steamService.checkApiHealth();

            const statusCode = health.status === 'healthy' ? 200 : 503;

            console.log(`💊 Estado de salud: ${health.status}`);

            res.status(statusCode).json({
                success: health.status === 'healthy',
                data: {
                    status: health.status,
                    timestamp: new Date().toISOString(),
                    apiKeyConfigured: health.apiKeyConfigured,
                    ...(health.error && { error: health.error }),
                    ...(health.responseTime && { responseTime: health.responseTime })
                }
            });

        } catch (error) {
            console.error('❌ Error verificando salud:', error);
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

            console.log('📨 Webhook recibido de Steam:', body);

            res.json({
                success: true,
                message: 'Webhook procesado correctamente',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Error procesando webhook:', error);
            res.status(500).json({
                success: false,
                message: 'Error procesando webhook',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Método para validar Steam ID desde URL
    validateSteamId(req, res) {
        try {
            const steamId = req.params.steamId || req.query.steam_id;

            console.log('🔍 Validando Steam ID:', steamId);

            if (!steamId) {
                return res.status(400).json({
                    success: false,
                    message: 'Steam ID requerido'
                });
            }

            // Validar formato del Steam ID (debe ser un número de 17 dígitos)
            if (!/^\d{17}$/.test(steamId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de Steam ID inválido. Debe ser un número de 17 dígitos.',
                    provided: steamId,
                    format: 'Expected: 17 digits (e.g., 76561198000000000)'
                });
            }

            console.log('✅ Steam ID válido');

            res.json({
                success: true,
                data: {
                    steamId: steamId,
                    isValid: true,
                    format: 'Steam64'
                }
            });

        } catch (error) {
            console.error('❌ Error validando Steam ID:', error);
            res.status(500).json({
                success: false,
                message: 'Error validando Steam ID'
            });
        }
    }
}

export default SteamControlador;
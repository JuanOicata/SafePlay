// controladores/steamControlador.js
import SteamService from '../src/services/steamService.js';

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
            let steamId = req.params.steamId;

            // Si no hay steamId en params, intentar obtenerlo de diferentes fuentes
            if (!steamId) {
                steamId = req.query.steam_id || req.user?.steamId || req.session?.steamId;
            }

            if (!steamId) {
                return res.status(400).json({
                    success: false,
                    message: 'Steam ID requerido'
                });
            }

            console.log(`Obteniendo perfil para Steam ID: ${steamId}`);

            // Verificar que el Steam ID tenga el formato correcto
            if (!/^\d{17}$/.test(steamId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de Steam ID inválido'
                });
            }

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

            if (error.message.includes('403') || error.message.includes('Forbidden')) {
                return res.status(403).json({
                    success: false,
                    message: 'Perfil privado o no disponible'
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
            let steamId = req.params.steamId;

            if (!steamId) {
                steamId = req.query.steam_id || req.user?.steamId || req.session?.steamId;
            }

            if (!steamId) {
                return res.status(400).json({
                    success: false,
                    message: 'Steam ID requerido'
                });
            }

            const { limit, sortBy } = req.query;

            console.log(`Obteniendo juegos para Steam ID: ${steamId}`);

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

            if (error.message.includes('403') || error.message.includes('Forbidden')) {
                return res.status(403).json({
                    success: false,
                    message: 'Lista de juegos privada o no disponible'
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
            let steamId = req.params.steamId;

            if (!steamId) {
                steamId = req.query.steam_id || req.user?.steamId || req.session?.steamId;
            }

            if (!steamId) {
                return res.status(400).json({
                    success: false,
                    message: 'Steam ID requerido'
                });
            }

            console.log(`Obteniendo resumen completo para Steam ID: ${steamId}`);

            // Verificar formato del Steam ID
            if (!/^\d{17}$/.test(steamId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de Steam ID inválido'
                });
            }

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

            if (error.message.includes('403') || error.message.includes('Forbidden')) {
                return res.status(403).json({
                    success: false,
                    message: 'Datos del usuario no disponibles (perfil privado)'
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
            let steamId = req.params.steamId;
            const { appId } = req.params;

            if (!steamId) {
                steamId = req.query.steam_id || req.user?.steamId || req.session?.steamId;
            }

            if (!steamId || !appId) {
                return res.status(400).json({
                    success: false,
                    message: 'Steam ID y App ID requeridos'
                });
            }

            console.log(`Obteniendo estadísticas para Steam ID: ${steamId}, App ID: ${appId}`);

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
            console.error('Error obteniendo estadísticas:', error);

            if (error.message.includes('Steam API Key')) {
                return res.status(500).json({
                    success: false,
                    message: 'Configuración de Steam API incompleta'
                });
            }

            if (error.message.includes('403') || error.message.includes('Forbidden')) {
                return res.status(403).json({
                    success: false,
                    message: 'Estadísticas no disponibles (perfil privado)'
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
            let steamId = req.params.steamId;
            const { appId } = req.params;

            if (!steamId) {
                steamId = req.query.steam_id || req.user?.steamId || req.session?.steamId;
            }

            if (!steamId || !appId) {
                return res.status(400).json({
                    success: false,
                    message: 'Steam ID y App ID requeridos'
                });
            }

            console.log(`Obteniendo logros para Steam ID: ${steamId}, App ID: ${appId}`);

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
            console.error('Error obteniendo logros:', error);

            if (error.message.includes('Steam API Key')) {
                return res.status(500).json({
                    success: false,
                    message: 'Configuración de Steam API incompleta'
                });
            }

            if (error.message.includes('403') || error.message.includes('Forbidden')) {
                return res.status(403).json({
                    success: false,
                    message: 'Logros no disponibles (perfil privado)'
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
            let steamId = req.params.steamId;

            if (!steamId) {
                steamId = req.query.steam_id || req.user?.steamId || req.session?.steamId;
            }

            if (!steamId) {
                return res.status(400).json({
                    success: false,
                    message: 'Steam ID requerido'
                });
            }

            console.log(`Obteniendo estadísticas parentales para Steam ID: ${steamId}`);

            // Verificar formato del Steam ID
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
            console.error('Error obteniendo estadísticas parentales:', error);

            if (error.message.includes('Steam API Key')) {
                return res.status(500).json({
                    success: false,
                    message: 'Configuración de Steam API incompleta'
                });
            }

            if (error.message.includes('403') || error.message.includes('Forbidden')) {
                return res.status(403).json({
                    success: false,
                    message: 'Datos no disponibles (perfil privado)'
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

    // Método para validar Steam ID desde URL
    validateSteamId(req, res) {
        try {
            const steamId = req.params.steamId || req.query.steam_id;

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
                    message: 'Formato de Steam ID inválido. Debe ser un número de 17 dígitos.'
                });
            }

            res.json({
                success: true,
                data: {
                    steamId: steamId,
                    isValid: true
                }
            });

        } catch (error) {
            console.error('Error validando Steam ID:', error);
            res.status(500).json({
                success: false,
                message: 'Error validando Steam ID'
            });
        }
    }
}

// Añade este método a tu SteamControlador

async debugSteamApi(req, res) {
    try {
        const { steamId } = req.params || {};
        const testSteamId = steamId || '76561197960435530'; // Steam ID público de prueba

        console.log('=== STEAM API DEBUG ===');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Steam ID a probar:', testSteamId);
        console.log('API Key configurada:', !!process.env.STEAM_API_KEY);
        console.log('Longitud API Key:', process.env.STEAM_API_KEY?.length);
        console.log('NODE_ENV:', process.env.NODE_ENV);

        // Test 1: Health check básico
        let healthCheck;
        try {
            healthCheck = await this.steamService.checkApiHealth();
            console.log('Health check resultado:', healthCheck);
        } catch (error) {
            healthCheck = { status: 'error', error: error.message };
            console.log('Health check falló:', error.message);
        }

        // Test 2: Obtener perfil
        let profileTest;
        try {
            const profile = await this.steamService.getPlayerSummary(testSteamId);
            profileTest = {
                status: 'success',
                playerName: profile?.personaname,
                steamId: profile?.steamid,
                visibility: profile?.communityvisibilitystate
            };
            console.log('Perfil obtenido exitosamente:', profile?.personaname);
        } catch (error) {
            profileTest = { status: 'error', error: error.message };
            console.log('Error obteniendo perfil:', error.message);
        }

        // Test 3: Probar Steam ID específico si es diferente
        let specificTest = null;
        if (steamId && steamId !== '76561197960435530') {
            try {
                const specificProfile = await this.steamService.getPlayerSummary(steamId);
                specificTest = {
                    status: 'success',
                    playerName: specificProfile?.personaname,
                    steamId: specificProfile?.steamid,
                    visibility: specificProfile?.communityvisibilitystate
                };
                console.log('Steam ID específico funciona:', specificProfile?.personaname);
            } catch (error) {
                specificTest = { status: 'error', error: error.message };
                console.log('Error con Steam ID específico:', error.message);
            }
        }

        // Resultado del debug
        const debugResult = {
            timestamp: new Date().toISOString(),
            environment: {
                nodeEnv: process.env.NODE_ENV,
                apiKeyConfigured: !!process.env.STEAM_API_KEY,
                apiKeyLength: process.env.STEAM_API_KEY?.length,
                appUrl: process.env.APP_URL
            },
            tests: {
                healthCheck,
                profileTest,
                specificTest
            },
            steamIds: {
                tested: testSteamId,
                specific: steamId || null
            }
        };

        console.log('=== DEBUG COMPLETADO ===');

        res.json({
            success: true,
            message: 'Debug completado - revisa los logs del servidor',
            debug: debugResult
        });

    } catch (error) {
        console.error('Error en debug endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Error ejecutando debug',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// Y añade esta ruta en tu router de Steam:
// router.get('/debug/:steamId?', steamControlador.debugSteamApi.bind(steamControlador));
export default SteamControlador;
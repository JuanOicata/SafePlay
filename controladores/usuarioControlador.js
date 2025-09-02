// Actualización para tu usuarioControlador.js existente
// Agrega estos métodos a tu controlador actual

const SteamService = require('../services/steamService');

// ... tu código existente ...

// ==========================================
// NUEVOS MÉTODOS PARA STEAM
// ==========================================

// Instanciar servicio de Steam
const steamService = new SteamService();

/**
 * Registro mejorado que detecta si viene de Steam
 */
async function registroConSteam(req, res) {
    try {
        const { steamId, steamData, ...userData } = req.body;

        // Si viene de Steam, procesar datos adicionales
        if (steamId && steamData) {
            console.log('📝 Registro con datos de Steam');

            // Combinar datos del formulario con datos de Steam
            const usuarioCompleto = {
                ...userData,
                steamId: steamId,
                avatar: steamData.avatar || null,
                steamProfile: JSON.stringify(steamData),
                verificadoSteam: true,
                fechaVerificacion: new Date()
            };

            // Usar tu lógica existente de registro pero con datos adicionales
            const nuevoUsuario = await crearUsuarioConSteam(usuarioCompleto);

            res.json({
                success: true,
                message: 'Usuario registrado exitosamente con Steam',
                user: {
                    id: nuevoUsuario.id,
                    nombre: nuevoUsuario.nombre,
                    rol: nuevoUsuario.rol,
                    steamId: nuevoUsuario.steamId
                }
            });

        } else {
            // Registro normal sin Steam - usar tu lógica existente
            await registroNormal(req, res);
        }

    } catch (error) {
        console.error('Error en registro con Steam:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar registro'
        });
    }
}

/**
 * Login mejorado que maneja Steam
 */
async function loginConSteam(req, res) {
    try {
        const { usuario, password, steamLogin = false } = req.body;

        if (steamLogin) {
            // Redirigir a Steam OAuth
            const authUrl = steamService.generateAuthUrl();

            res.json({
                success: true,
                steamAuth: true,
                authUrl: authUrl
            });

        } else {
            // Login normal - usar tu lógica existente
            await loginNormal(req, res);
        }

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar login'
        });
    }
}

/**
 * Vincular cuenta existente con Steam
 */
async function vincularSteam(req, res) {
    try {
        const userId = req.session.user.id;
        const { steamId } = req.body;

        if (!steamId) {
            return res.status(400).json({
                success: false,
                message: 'Steam ID requerido'
            });
        }

        // Obtener datos de Steam
        const steamData = await steamService.getCompleteUserData(steamId);

        if (!steamData.success) {
            return res.status(400).json({
                success: false,
                message: 'No se pudieron obtener datos de Steam'
            });
        }

        // Actualizar usuario existente con datos de Steam
        const usuarioActualizado = await actualizarConDatosSteam(userId, {
            steamId: steamId,
            steamProfile: JSON.stringify(steamData.data),
            avatar: steamData.data.profile.avatar,
            verificadoSteam: true,
            fechaVerificacion: new Date()
        });

        // Actualizar sesión
        req.session.user.steamId = steamId;
        req.session.user.avatar = steamData.data.profile.avatar;

        res.json({
            success: true,
            message: 'Cuenta vinculada con Steam exitosamente',
            steamData: steamData.data
        });

    } catch (error) {
        console.error('Error vinculando Steam:', error);
        res.status(500).json({
            success: false,
            message: 'Error al vincular cuenta con Steam'
        });
    }
}

/**
 * Obtener dashboard data para jugador
 */
async function getDashboardJugador(req, res) {
    try {
        const user = req.session.user;

        let dashboardData = {
            user: {
                nombre: user.nombre,
                avatar: user.avatar || null,
                rol: user.rol
            },
            steamData: null,
            games: [],
            stats: {
                totalGames: 0,
                totalPlaytime: 0,
                recentPlaytime: 0
            }
        };

        // Si el usuario tiene Steam vinculado
        if (user.steamId) {
            console.log('🎮 Obteniendo datos de Steam para dashboard...');

            const steamData = await steamService.getCompleteUserData(user.steamId);

            if (steamData.success) {
                dashboardData.steamData = steamData.data;
                dashboardData.games = steamData.data.games.games.slice(0, 10); // Top 10
                dashboardData.stats = steamData.data.stats;
            }
        }

        res.json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error('Error obteniendo dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar dashboard'
        });
    }
}

/**
 * Obtener dashboard data para supervisor
 */
async function getDashboardSupervisor(req, res) {
    try {
        const supervisor = req.session.user;

        if (supervisor.rol !== 'vendedor') {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado'
            });
        }

        // Obtener todos los jugadores supervisados
        const jugadores = await obtenerJugadoresSupervisados(supervisor.id);

        // Obtener estadísticas de Steam para cada jugador
        const jugadoresConSteam = await Promise.all(
            jugadores.map(async (jugador) => {
                if (jugador.steamId) {
                    try {
                        const steamData = await steamService.getCompleteUserData(jugador.steamId);
                        return {
                            ...jugador,
                            steamData: steamData.success ? steamData.data : null
                        };
                    } catch (error) {
                        console.error(`Error obteniendo datos Steam para ${jugador.nombre}:`, error);
                        return jugador;
                    }
                }
                return jugador;
            })
        );

        res.json({
            success: true,
            data: {
                supervisor: {
                    nombre: supervisor.nombre,
                    avatar: supervisor.avatar
                },
                jugadores: jugadoresConSteam,
                estadisticas: calcularEstadisticasGenerales(jugadoresConSteam)
            }
        });

    } catch (error) {
        console.error('Error obteniendo dashboard supervisor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar dashboard de supervisor'
        });
    }
}

// ==========================================
// FUNCIONES AUXILIARES PARA INTEGRAR CON TU DB
// ==========================================

/**
 * Crear usuario con datos de Steam
 */
async function crearUsuarioConSteam(userData) {
    // Integrar con tu usuariosModel.js existente

    /*
    const UsuariosModel = require('../models/usuariosModel');
    
    return await UsuariosModel.create({
        nombre: userData.nombre,
        usuario: userData.usuario,
        correo: userData.correo,
        telefono: userData.telefono,
        cedula: userData.cedula,
        rol: userData.rol,
        password: userData.password, // Ya hasheada
        steamId: userData.steamId,
        avatar: userData.avatar,
        steamProfile: userData.steamProfile,
        verificadoSteam: userData.verificadoSteam,
        fechaVerificacion: userData.fechaVerificacion,
        createdAt: new Date()
    });
    */

    // Simulación temporal
    return {
        id: Date.now(),
        ...userData,
        createdAt: new Date()
    };
}

/**
 * Actualizar usuario existente con datos de Steam
 */
async function actualizarConDatosSteam(userId, steamData) {
    // Integrar con tu usuariosModel.js existente

    /*
    const UsuariosModel = require('../models/usuariosModel');
    
    return await UsuariosModel.updateById(userId, {
        steamId: steamData.steamId,
        steamProfile: steamData.steamProfile,
        avatar: steamData.avatar,
        verificadoSteam: steamData.verificadoSteam,
        fechaVerificacion: steamData.fechaVerificacion,
        updatedAt: new Date()
    });
    */

    // Simulación temporal
    return { id: userId, ...steamData };
}

/**
 * Obtener jugadores supervisados por un supervisor
 */
async function obtenerJugadoresSupervisados(supervisorId) {
    // Integrar con tu lógica de relaciones supervisor-jugador

    /*
    const UsuariosModel = require('../models/usuariosModel');
    
    return await UsuariosModel.findBySupervidor(supervisorId);
    */

    // Simulación temporal
    return [
        {
            id: 1,
            nombre: 'Jugador 1',
            usuario: 'player1',
            steamId: '76561197960434622',
            avatar: null,
            rol: 'comprador'
        }
    ];
}

/**
 * Calcular estadísticas generales para supervisor
 */
function calcularEstadisticasGenerales(jugadores) {
    const stats = {
        totalJugadores: jugadores.length,
        jugadoresActivos: 0,
        tiempoTotalSemana: 0,
        promedioTiempoDiario: 0,
        alertas: []
    };

    jugadores.forEach(jugador => {
        if (jugador.steamData && jugador.steamData.stats.recentPlaytime > 0) {
            stats.jugadoresActivos++;
            stats.tiempoTotalSemana += jugador.steamData.stats.recentPlaytime;

            // Generar alertas
            const dailyAvg = jugador.steamData.stats.recentPlaytime / 7;
            if (dailyAvg > 6) {
                stats.alertas.push({
                    jugador: jugador.nombre,
                    tipo: 'tiempo_excesivo',
                    mensaje: `${Math.round(dailyAvg)}h promedio diario`
                });
            }
        }
    });

    stats.promedioTiempoDiario = stats.jugadoresActivos > 0
        ? Math.round(stats.tiempoTotalSemana / 7 / stats.jugadoresActivos * 100) / 100
        : 0;

    return stats;
}

// ==========================================
// EXPORTAR FUNCIONES (agregar a tu exports existente)
// ==========================================

module.exports = {
    // ... tus exports existentes ...

    // Nuevos exports para Steam
    registroConSteam,
    loginConSteam,
    vincularSteam,
    getDashboardJugador,
    getDashboardSupervisor
};
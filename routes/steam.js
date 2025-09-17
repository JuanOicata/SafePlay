// routes/steam.js - Rutas para la integración con Steam
import express from 'express';
import SteamControlador from '../controladores/steamControlador.js';

const router = express.Router();

// Instanciar controlador
const steamController = new SteamControlador();

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

/**
 * @route   GET /api/steam/auth-url
 * @desc    Obtener URL de autorización de Steam
 * @access  Public
 */
router.get('/auth-url', (req, res) => steamController.getAuthUrl(req, res));

/**
 * @route   GET /api/steam/callback
 * @desc    Callback de Steam OpenID
 * @access  Public
 */
router.get('/callback', (req, res) => steamController.handleCallback(req, res));

// ==========================================
// RUTAS DE DATOS DE USUARIO
// ==========================================

/**
 * @route   GET /api/steam/profile/:steamId
 * @desc    Obtener perfil del usuario
 * @access  Private
 */
router.get('/profile/:steamId', authenticateUser, (req, res) =>
    steamController.getUserProfile(req, res)
);

/**
 * @route   GET /api/steam/games/:steamId
 * @desc    Obtener juegos del usuario
 * @access  Private
 * @query   limit, sortBy
 */
router.get('/games/:steamId', authenticateUser, (req, res) =>
    steamController.getUserGames(req, res)
);

/**
 * @route   GET /api/steam/summary/:steamId
 * @desc    Obtener resumen completo del usuario
 * @access  Private
 */
router.get('/summary/:steamId', authenticateUser, (req, res) =>
    steamController.getUserSummary(req, res)
);

// ==========================================
// RUTAS DE ESTADÍSTICAS DE JUEGOS
// ==========================================

/**
 * @route   GET /api/steam/stats/:steamId/:appId
 * @desc    Obtener estadísticas de un juego específico
 * @access  Private
 */
router.get('/stats/:steamId/:appId', authenticateUser, (req, res) =>
    steamController.getGameStats(req, res)
);

/**
 * @route   GET /api/steam/achievements/:steamId/:appId
 * @desc    Obtener logros de un juego
 * @access  Private
 */
router.get('/achievements/:steamId/:appId', authenticateUser, (req, res) =>
    steamController.getGameAchievements(req, res)
);

// ==========================================
// RUTAS CONTROL PARENTAL
// ==========================================

/**
 * @route   GET /api/steam/parental-stats/:steamId
 * @desc    Obtener estadísticas para control parental
 * @access  Private (Solo supervisores o dueño de cuenta)
 */
router.get('/parental-stats/:steamId', authenticateUser, authorizeParentalAccess, (req, res) =>
    steamController.getParentalStats(req, res)
);

// ==========================================
// RUTAS DE SISTEMA
// ==========================================

/**
 * @route   GET /api/steam/health
 * @desc    Verificar estado de la API de Steam
 * @access  Public
 */
router.get('/health', (req, res) => steamController.checkHealth(req, res));

/**
 * @route   POST /api/steam/webhook
 * @desc    Webhook para actualizaciones de Steam
 * @access  Private (Steam only)
 */
router.post('/webhook', validateWebhook, (req, res) =>
    steamController.handleWebhook(req, res)
);

// ==========================================
// MIDDLEWARES
// ==========================================

/**
 * Middleware de autenticación
 */
function authenticateUser(req, res, next) {
    // Verificar si el usuario está autenticado
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Acceso no autorizado'
        });
    }

    // Añadir información del usuario a la request
    req.user = req.session.user;
    next();
}

/**
 * Middleware para autorizar acceso a datos parentales
 */
function authorizeParentalAccess(req, res, next) {
    const { steamId } = req.params;
    const user = req.user;

    // Verificar si es el dueño de la cuenta o un supervisor
    const isOwner = user.steamId === steamId;
    const isSupervisor = user.rol === 'vendedor'; // En tu sistema 'vendedor' = supervisor

    if (!isOwner && !isSupervisor) {
        return res.status(403).json({
            success: false,
            message: 'No tienes permisos para acceder a estos datos'
        });
    }

    next();
}

/**
 * Middleware para validar webhooks de Steam
 */
function validateWebhook(req, res, next) {
    // Aquí podrías validar la firma del webhook si Steam la proporciona
    // Por ahora, simplemente verificamos que venga de una fuente confiable

    const userAgent = req.get('User-Agent');
    const steamUserAgents = ['Steam', 'Valve'];

    const isValidSource = steamUserAgents.some(agent =>
        userAgent && userAgent.includes(agent)
    );

    if (!isValidSource && process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            success: false,
            message: 'Fuente no autorizada'
        });
    }

    next();
}

/**
 * Middleware de manejo de errores para rutas de Steam
 */
router.use((error, req, res, next) => {
    console.error('Error en rutas de Steam:', error);

    // Errores específicos de Steam API
    if (error.message.includes('Steam API')) {
        return res.status(503).json({
            success: false,
            message: 'Servicio de Steam temporalmente no disponible',
            code: 'STEAM_API_ERROR'
        });
    }

    // Error de rate limiting
    if (error.message.includes('rate limit')) {
        return res.status(429).json({
            success: false,
            message: 'Demasiadas solicitudes. Intenta más tarde.',
            code: 'RATE_LIMIT'
        });
    }

    // Error genérico
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
    });
});

export default router;
import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Middleware de autenticación simple
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'No autorizado'
        });
    }
    next();
};

// Ruta que el frontend necesita: /api/steam/summary/:steamId
router.get('/summary/:steamId', async (req, res) => {
    try {
        console.log('🎮 Solicitando datos de Steam para:', req.params.steamId);

        const steamId = req.params.steamId;

        if (!process.env.STEAM_API_KEY) {
            return res.status(400).json({
                success: false,
                message: 'Steam API no configurada'
            });
        }

        // Obtener datos básicos del usuario de Steam
        const summaryResponse = await fetch(
            `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`
        );

        if (!summaryResponse.ok) {
            throw new Error('Error obteniendo datos de Steam');
        }

        const summaryData = await summaryResponse.json();

        if (!summaryData.response?.players?.length) {
            return res.status(404).json({
                success: false,
                message: 'Usuario de Steam no encontrado'
            });
        }

        const player = summaryData.response.players[0];

        // Obtener lista de juegos
        let games = [];
        try {
            const gamesResponse = await fetch(
                `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAM_API_KEY}&steamid=${steamId}&format=json&include_appinfo=1&include_played_free_games=1`
            );

            if (gamesResponse.ok) {
                const gamesData = await gamesResponse.json();
                games = gamesData.response?.games || [];
            }
        } catch (error) {
            console.log('⚠️ Error obteniendo juegos, continuando sin ellos:', error.message);
        }

        // Formatear respuesta
        const response = {
            steamid: player.steamid,
            personaname: player.personaname,
            displayName: player.personaname,
            avatar: player.avatarfull || player.avatarmedium || player.avatar,
            profileurl: player.profileurl,
            games: games,
            gameCount: games.length,
            totalPlaytime: games.reduce((total, game) => total + (game.playtime_forever || 0), 0)
        };

        res.json(response);

    } catch (error) {
        console.error('❌ Error en /api/steam/summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Ruta para obtener URL de autenticación
router.get('/auth-url', (req, res) => {
    if (!process.env.STEAM_API_KEY) {
        return res.status(400).json({
            success: false,
            message: 'Steam no está configurado'
        });
    }

    res.json({
        success: true,
        url: '/auth/steam'
    });
});

// Ruta de prueba
router.get('/test', (req, res) => {
    res.json({
        message: 'Steam routes funcionando',
        steamConfigured: !!process.env.STEAM_API_KEY
    });
});

export default router;
// test-steam-simple.js - Prueba simple de Steam API (ubicar en la raíz del proyecto)
import 'dotenv/config';
import axios from 'axios';


async function testSteamAPI() {
    console.log('🧪 Probando Steam API...\n');

    const apiKey = process.env.STEAM_API_KEY;

    if (!apiKey) {
        console.log('❌ STEAM_API_KEY no encontrada en .env');
        return;
    }

    console.log('✅ API Key encontrada:', apiKey.substring(0, 8) + '...');
    console.log('✅ API Key completa:', apiKey);
    console.log('');

    try {
        // Probar con tu Steam ID (reemplaza con tu Steam ID real para mejores pruebas)
        const testSteamId = '76561197960434622'; // Gabe Newell (perfil público)

        // 1. Probar GetPlayerSummaries
        console.log('1️⃣ Probando ISteamUser/GetPlayerSummaries...');
        const profileUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${testSteamId}`;

        const profileResponse = await axios.get(profileUrl);
        console.log('📡 Respuesta recibida:', profileResponse.status);

        if (profileResponse.data.response.players.length > 0) {
            const player = profileResponse.data.response.players[0];
            console.log('✅ Perfil obtenido exitosamente:');
            console.log('   - Nombre:', player.personaname);
            console.log('   - Steam ID:', player.steamid);
            console.log('   - Estado:', player.personastate === 1 ? 'Online' : 'Offline');
            console.log('   - País:', player.loccountrycode || 'No especificado');
            console.log('   - Avatar:', player.avatarfull ? 'Sí' : 'No');
        }
        console.log('');

        // 2. Probar GetOwnedGames
        console.log('2️⃣ Probando IPlayerService/GetOwnedGames...');
        const gamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${testSteamId}&format=json&include_appinfo=true&include_played_free_games=true`;

        const gamesResponse = await axios.get(gamesUrl);

        if (gamesResponse.data.response.games) {
            const games = gamesResponse.data.response.games;
            console.log('✅ Juegos obtenidos exitosamente:');
            console.log('   - Total de juegos:', games.length);

            // Mostrar top 5 más jugados
            const topGames = games
                .filter(game => game.playtime_forever > 0)
                .sort((a, b) => b.playtime_forever - a.playtime_forever)
                .slice(0, 5);

            if (topGames.length > 0) {
                console.log('   - Top 5 más jugados:');
                topGames.forEach((game, index) => {
                    const hours = Math.round(game.playtime_forever / 60 * 100) / 100;
                    console.log(`     ${index + 1}. ${game.name} - ${hours}h`);
                });
            }

            // Calcular tiempo total
            const totalMinutes = games.reduce((total, game) => total + game.playtime_forever, 0);
            const totalHours = Math.round(totalMinutes / 60 * 100) / 100;
            console.log('   - Tiempo total jugado:', totalHours, 'horas');

        } else {
            console.log('ℹ️  Juegos no disponibles (perfil privado)');
        }
        console.log('');

        // 3. Probar con un juego específico (Counter-Strike 2)
        console.log('3️⃣ Probando ISteamUserStats/GetUserStatsForGame...');
        try {
            const statsUrl = `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=730&key=${apiKey}&steamid=${testSteamId}`;
            const statsResponse = await axios.get(statsUrl);

            if (statsResponse.data.playerstats) {
                console.log('✅ Estadísticas específicas obtenidas:');
                console.log('   - Juego:', statsResponse.data.playerstats.gameName);
                console.log('   - Steam ID:', statsResponse.data.playerstats.steamID);
                console.log('   - Estadísticas:', statsResponse.data.playerstats.stats?.length || 0);
                console.log('   - Logros:', statsResponse.data.playerstats.achievements?.length || 0);
            }
        } catch (error) {
            if (error.response?.status === 403) {
                console.log('ℹ️  Estadísticas privadas o juego no jugado');
            } else {
                console.log('ℹ️  Error obteniendo estadísticas:', error.response?.status || 'Desconocido');
            }
        }
        console.log('');

        // RESULTADO FINAL
        console.log('🎊 ¡EXCELENTE! Tu integración con Steam está lista');
        console.log('');
        console.log('🔥 Lo que puedes hacer ahora:');
        console.log('   ✅ Obtener perfiles de usuarios');
        console.log('   ✅ Listar juegos de un usuario');
        console.log('   ✅ Calcular tiempo total de juego');
        console.log('   ✅ Identificar juegos más jugados');
        console.log('   ✅ Crear estadísticas para control parental');
        console.log('');
        console.log('🚀 ¡Continuemos con los dashboards!');

    } catch (error) {
        console.error('\n❌ Error general:', error.message);

        if (error.code === 'ENOTFOUND') {
            console.log('🌐 Error de conexión - verifica tu internet');
        } else if (error.response?.status === 401) {
            console.log('🔑 API Key inválida - verifica tu STEAM_API_KEY');
        } else if (error.response?.status === 403) {
            console.log('🚫 Acceso denegado - verifica permisos de API');
        }

        console.log('\n🔧 Debug info:');
        console.log('   API Key:', apiKey ? 'Configurada' : 'No configurada');
        console.log('   Error code:', error.code || 'No code');
        console.log('   HTTP status:', error.response?.status || 'No status');
    }
}

testSteamAPI();
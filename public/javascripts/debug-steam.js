// debug-steam.js - Script para diagnosticar problemas con Steam API
/*import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

class SteamDebugger {
    constructor() {
        this.apiKey = process.env.STEAM_API_KEY;
        this.baseUrl = 'https://api.steampowered.com';
        console.log('Steam API Key configurada:', this.apiKey ? 'SÍ' : 'NO');
        console.log('Steam API Key (primeros 8 caracteres):', this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'N/A');
    }

    async testApiKey() {
        console.log('\n=== PRUEBA 1: Verificar API Key ===');

        if (!this.apiKey) {
            console.log('No hay API Key configurada');
            return false;
        }

        try {
            const url = `${this.baseUrl}/ISteamWebAPIUtil/GetServerInfo/v0001/?key=${this.apiKey}&format=json`;
            console.log('Probando URL:', url.replace(this.apiKey, 'HIDDEN'));

            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                console.log('API Key válida - Servidor Steam respondió correctamente');
                console.log('Tiempo del servidor Steam:', data.servertimestring);
                return true;
            } else {
                console.log('Error en respuesta:', response.status, response.statusText);
                console.log('Datos:', data);
                return false;
            }
        } catch (error) {
            console.log('Error probando API Key:', error.message);
            return false;
        }
    }

    async testPlayerProfile(steamId = '76561197960435530') {
        console.log('\n=== PRUEBA 2: Obtener perfil de jugador ===');
        console.log('Steam ID de prueba:', steamId);

        if (!this.apiKey) {
            console.log('No se puede probar sin API Key');
            return false;
        }

        try {
            const url = `${this.baseUrl}/ISteamUser/GetPlayerSummaries/v0002/?key=${this.apiKey}&steamids=${steamId}&format=json`;
            console.log('Probando URL:', url.replace(this.apiKey, 'HIDDEN'));

            const response = await fetch(url);

            console.log('Status de respuesta:', response.status);
            console.log('Headers de respuesta:', Object.fromEntries(response.headers));

            if (!response.ok) {
                console.log('Error HTTP:', response.status, response.statusText);
                const errorText = await response.text();
                console.log('Contenido de error:', errorText);
                return false;
            }

            const data = await response.json();

            if (data.response && data.response.players && data.response.players.length > 0) {
                const player = data.response.players[0];
                console.log('Perfil obtenido exitosamente:');
                console.log('- Nombre:', player.personaname);
                console.log('- Steam ID:', player.steamid);
                console.log('- Estado:', player.personastate);
                console.log('- Perfil público:', player.communityvisibilitystate === 3 ? 'SÍ' : 'NO');
                return true;
            } else {
                console.log('No se encontró información del jugador');
                console.log('Respuesta completa:', JSON.stringify(data, null, 2));
                return false;
            }
        } catch (error) {
            console.log('Error obteniendo perfil:', error.message);
            return false;
        }
    }

    async testPlayerGames(steamId = '76561197960435530') {
        console.log('\n=== PRUEBA 3: Obtener juegos del jugador ===');

        if (!this.apiKey) {
            console.log('No se puede probar sin API Key');
            return false;
        }

        try {
            const url = `${this.baseUrl}/IPlayerService/GetOwnedGames/v0001/?key=${this.apiKey}&steamid=${steamId}&include_appinfo=1&format=json`;
            console.log('Probando URL:', url.replace(this.apiKey, 'HIDDEN'));

            const response = await fetch(url);
            console.log('Status de respuesta:', response.status);

            if (!response.ok) {
                console.log('Error HTTP:', response.status, response.statusText);
                const errorText = await response.text();
                console.log('Contenido de error:', errorText);
                return false;
            }

            const data = await response.json();

            if (data.response) {
                console.log('Total de juegos:', data.response.game_count || 0);

                if (data.response.games && data.response.games.length > 0) {
                    console.log('Primeros 3 juegos:');
                    data.response.games.slice(0, 3).forEach(game => {
                        console.log(`- ${game.name} (${game.playtime_forever} minutos)`);
                    });
                } else {
                    console.log('Lista de juegos vacía o privada');
                }
                return true;
            } else {
                console.log('Respuesta inválida:', JSON.stringify(data, null, 2));
                return false;
            }
        } catch (error) {
            console.log('Error obteniendo juegos:', error.message);
            return false;
        }
    }

    async testYourSteamId(steamId) {
        console.log('\n=== PRUEBA 4: Probar con tu Steam ID ===');
        console.log('Tu Steam ID:', steamId);

        const profileTest = await this.testPlayerProfile(steamId);
        const gamesTest = await this.testPlayerGames(steamId);

        return { profileTest, gamesTest };
    }

    async runAllTests() {
        console.log('==========================================');
        console.log('DIAGNÓSTICO DE STEAM API');
        console.log('==========================================');

        const apiKeyTest = await this.testApiKey();

        if (!apiKeyTest) {
            console.log('\nPROBLEMA DETECTADO: API Key no funciona correctamente');
            console.log('Soluciones posibles:');
            console.log('1. Verificar que STEAM_API_KEY esté en tu archivo .env');
            console.log('2. Verificar que la API Key sea válida en https://steamcommunity.com/dev/apikey');
            console.log('3. Verificar que no tenga espacios adicionales');
            return false;
        }

        console.log('\nAPI Key funcionando correctamente');

        // Probar con Steam ID conocido
        await this.testPlayerProfile();
        await this.testPlayerGames();

        console.log('\n==========================================');
        console.log('DIAGNÓSTICO COMPLETADO');
        console.log('==========================================');

        return true;
    }
}

// Función para probar tu Steam ID específico
async function testSpecificSteamId(steamId) {
    const debugger = new SteamDebugger();

    console.log('==========================================');
    console.log('PRUEBA ESPECÍFICA CON TU STEAM ID');
    console.log('==========================================');

    const results = await debugger.testYourSteamId(steamId);

    if (results.profileTest && results.gamesTest) {
        console.log('\nTu Steam ID funciona correctamente con la API');
    } else if (results.profileTest && !results.gamesTest) {
        console.log('\nPerfil accesible, pero juegos privados');
        console.log('Solución: Hacer pública tu lista de juegos en Steam');
    } else {
        console.log('\nProblema accediendo a tu Steam ID');
        console.log('Posibles causas:');
        console.log('1. Steam ID incorrecto');
        console.log('2. Perfil completamente privado');
        console.log('3. Usuario no existe');
    }
}

// Ejecutar diagnóstico
const debugger = new SteamDebugger();
debugger.runAllTests().then(() => {
    console.log('\nPara probar tu Steam ID específico, ejecuta:');
    console.log('testSpecificSteamId("76561199161140515")');
});

export { SteamDebugger, testSpecificSteamId };*/
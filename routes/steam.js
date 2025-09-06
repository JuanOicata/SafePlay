// Agregar estas correcciones a tu app.js

// 1. Agregar ruta de debug para Steam API (TEMPORAL - quitar en producción)
app.get('/debug/steam-api', async (req, res) => {
    try {
        console.log('🔍 DEBUG: Verificando Steam API...');

        const apiKey = process.env.STEAM_API_KEY;
        console.log('API Key configurada:', apiKey ? 'SÍ' : 'NO');
        console.log('API Key (primeros 8):', apiKey ? apiKey.substring(0, 8) + '...' : 'N/A');

        if (!apiKey) {
            return res.json({
                error: 'Steam API Key no configurada',
                env: process.env.NODE_ENV,
                hasKey: false
            });
        }

        // Probar conectividad básica
        const testUrl = `https://api.steampowered.com/ISteamWebAPIUtil/GetServerInfo/v0001/?key=${apiKey}&format=json`;

        const response = await fetch(testUrl);
        const data = await response.json();

        res.json({
            steamApiWorking: response.ok,
            steamServerTime: data.servertimestring,
            responseStatus: response.status,
            hasKey: true,
            keyFormat: apiKey.length === 32 ? 'Correcto (32 chars)' : `Incorrecto (${apiKey.length} chars)`
        });

    } catch (error) {
        console.error('Error en debug Steam:', error);
        res.status(500).json({
            error: error.message,
            hasKey: !!process.env.STEAM_API_KEY
        });
    }
});

// 2. Agregar ruta para probar Steam ID específico
app.get('/debug/steam-profile/:steamId', async (req, res) => {
    try {
        const { steamId } = req.params;
        const apiKey = process.env.STEAM_API_KEY;

        console.log(`🔍 DEBUG: Probando Steam ID ${steamId}...`);

        if (!apiKey) {
            return res.json({ error: 'Steam API Key no configurada' });
        }

        const profileUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}&format=json`;

        console.log('Llamando a Steam API...');
        const response = await fetch(profileUrl);

        console.log('Status de respuesta:', response.status);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.log('Error text:', errorText);

            return res.status(response.status).json({
                error: 'Steam API Error',
                status: response.status,
                statusText: response.statusText,
                body: errorText,
                url: profileUrl.replace(apiKey, 'HIDDEN_KEY')
            });
        }

        const data = await response.json();
        console.log('Datos recibidos:', JSON.stringify(data, null, 2));

        res.json({
            success: true,
            data: data,
            responseStatus: response.status
        });

    } catch (error) {
        console.error('Error probando perfil Steam:', error);
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// 3. Mejorar la configuración de CORS si es necesario
app.use((req, res, next) => {
    // Log detallado de todas las peticiones a /api/steam
    if (req.url.startsWith('/api/steam')) {
        console.log(`🌐 ${req.method} ${req.url}`);
        console.log('Headers:', req.headers);
        console.log('Query:', req.query);
        console.log('Params:', req.params);
        console.log('Session user:', req.session?.user);
    }
    next();
});

// 4. Corregir la ruta de Steam callback en app.js
app.get('/auth/steam/return',
    passport.authenticate('steam', { failureRedirect: '/login.html' }),
    async (req, res) => {
        try {
            console.log('🎮 Steam callback recibido:', req.user);

            // Verificar que el usuario de Steam tiene los datos necesarios
            if (!req.user || !req.user.steam_id) {
                console.error('❌ Usuario Steam inválido:', req.user);
                return res.redirect('/login.html?error=invalid-steam-user');
            }

            const existingUser = await checkUserExists('steam_id', req.user.steam_id);

            if (!existingUser) {
                console.log('👤 Creando nuevo usuario de Steam...');
                await insertJugador(
                    req.user.steam_id,
                    req.user.nombre_usuario,
                    req.user.nombre,
                    req.user.steam_avatar
                );
            } else {
                console.log('👤 Usuario Steam existente encontrado');
            }

            // CORREGIR: Establecer sesión con la estructura correcta
            req.session.user = {
                id: existingUser ? existingUser.id : null,
                steamId: req.user.steam_id, // Este es el campo importante
                nombre_usuario: req.user.nombre_usuario,
                avatar: req.user.steam_avatar,
                rol: 'jugador'
            };

            console.log('✅ Sesión Steam establecida:', req.session.user);

            // Guardar explícitamente la sesión antes de redirigir
            req.session.save((err) => {
                if (err) {
                    console.error('❌ Error guardando sesión:', err);
                }
                res.redirect(`/dashboard-jugador.html?steam_id=${req.user.steam_id}`);
            });

        } catch (error) {
            console.error('❌ Error Steam callback:', error);
            res.redirect('/login.html?error=steam-error');
        }
    }
);

// 5. Agregar middleware de debug para sesiones
app.use('/api/steam', (req, res, next) => {
    console.log('🔐 DEBUG SESSION para /api/steam:');
    console.log('- Session ID:', req.sessionID);
    console.log('- Session data:', req.session);
    console.log('- User in session:', req.session?.user);
    console.log('- Steam ID disponible:', req.session?.user?.steamId);
    next();
});

// 6. Agregar función helper para verificar Steam ID
function validateSteamIdFormat(steamId) {
    // Steam ID debe ser un número de 17 dígitos
    return /^\d{17}$/.test(steamId);
}

// 7. Mejorar función insertJugador para manejar conflictos
async function insertJugador(steam_id, nombre_usuario, nombre, steam_avatar) {
    try {
        console.log('💾 Insertando/actualizando jugador Steam...');
        console.log('Steam ID:', steam_id);
        console.log('Nombre usuario:', nombre_usuario);

        const existing = await pool.query('SELECT * FROM usuarios WHERE steam_id = $1', [steam_id]);

        if (existing.rows.length > 0) {
            console.log('👤 Usuario existente, actualizando último login...');
            await pool.query(
                `UPDATE usuarios 
                 SET ultimo_login = CURRENT_TIMESTAMP,
                     steam_avatar = $2,
                     nombre_usuario = $3,
                     nombre = $4
                 WHERE steam_id = $1`,
                [steam_id, steam_avatar, nombre_usuario, nombre]
            );
            return existing.rows[0];
        }

        console.log('👤 Creando nuevo usuario Steam...');
        const res = await pool.query(
            `INSERT INTO usuarios (steam_id, nombre_usuario, nombre, rol, steam_avatar, created_at)
             VALUES ($1, $2, $3, 'jugador', $4, CURRENT_TIMESTAMP) 
             RETURNING id, nombre_usuario, rol, steam_id`,
            [steam_id, nombre_usuario, nombre, steam_avatar]
        );

        console.log('✅ Usuario Steam creado:', res.rows[0]);
        return res.rows[0];
    } catch (err) {
        console.error("❌ Error insertando jugador Steam:", err.message);
        console.error("Stack trace:", err.stack);
        throw err;
    }
}
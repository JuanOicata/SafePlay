import pkg from "pg";
import bcrypt from 'bcryptjs';

const { Pool } = pkg;

// Configurar la conexión a la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ==========================================
// FUNCIONES DE AUTENTICACIÓN BÁSICA
// ==========================================

/**
 * Login normal (sin Steam)
 */
async function loginNormal(req, res) {
    try {
        console.log('🔑 Iniciando login normal...');
        const { usuario, password } = req.body;

        if (!usuario || !password) {
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son obligatorios'
            });
        }

        // Buscar usuario por nombre_usuario o email
        const result = await pool.query(
            `SELECT * FROM usuarios
             WHERE nombre_usuario = $1 OR email = $1`,
            [usuario]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = result.rows[0];

        // Validar contraseña
        const match = await bcrypt.compare(password, user.password || '');
        if (!match) {
            return res.status(400).json({
                success: false,
                message: 'Contraseña incorrecta'
            });
        }

        // Actualizar último login
        await pool.query(
            `UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1`,
            [user.id]
        );

        // Guardar en sesión
        req.session.user = {
            id: user.id,
            nombre_usuario: user.nombre_usuario,
            rol: user.rol,
            steamId: user.steam_id,
            avatar: user.steam_avatar
        };

        return res.json({
            success: true,
            message: 'Login exitoso',
            user: {
                id: user.id,
                nombre_usuario: user.nombre_usuario,
                rol: user.rol,
                steamId: user.steam_id
            },
            redirectUrl: user.rol === 'supervisor'
                ? '/dashboard-supervisor.html'
                : `/dashboard-jugador.html${user.steam_id ? '?steam_id=' + user.steam_id : ''}`
        });

    } catch (error) {
        console.error('❌ Error en login normal:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

/**
 * Registro normal
 */
async function registroNormal(req, res) {
    try {
        const { nombre, usuario, correo, telefono, cedula, rol, password, confirmPassword } = req.body;

        if (!nombre || !usuario || !correo || !telefono || !cedula || !rol || !password) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Las contraseñas no coinciden'
            });
        }

        if (rol !== 'supervisor') {
            return res.status(400).json({
                success: false,
                message: 'Solo se permite registro tradicional para supervisores'
            });
        }

        const existingUser = await checkUserExists('nombre_usuario', usuario);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de usuario ya está en uso'
            });
        }

        const existingEmail = await checkUserExists('email', correo);
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'El correo ya está registrado'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await insertSupervisor(nombre, usuario, correo, telefono, cedula, hashedPassword);

        res.json({
            success: true,
            message: 'Supervisor registrado exitosamente',
            redirectUrl: '/login.html'
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

// ==========================================
// FUNCIONES AUXILIARES DE BASE DE DATOS
// ==========================================

async function checkUserExists(field, value) {
    try {
        const allowedFields = ['nombre_usuario', 'email', 'steam_id', 'cedula'];
        if (!allowedFields.includes(field)) {
            return null;
        }
        const res = await pool.query(`SELECT * FROM usuarios WHERE ${field} = $1`, [value]);
        return res.rows[0] || null;
    } catch (err) {
        console.error("Error verificando usuario:", err.message);
        return null;
    }
}

async function insertSupervisor(nombre, nombre_usuario, email, telefono, cedula, password) {
    try {
        const res = await pool.query(
            `INSERT INTO usuarios (nombre, nombre_usuario, email, telefono, cedula, rol, password)
             VALUES ($1, $2, $3, $4, $5, 'supervisor', $6) RETURNING id, nombre_usuario, email, rol`,
            [nombre, nombre_usuario, email, telefono, cedula, password]
        );
        return res.rows[0];
    } catch (err) {
        if (err.code === '23505') {
            throw new Error('El usuario o email ya existe');
        }
        throw err;
    }
}

async function insertJugador(steam_id, nombre_usuario, nombre, steam_avatar) {
    try {
        const existing = await pool.query('SELECT * FROM usuarios WHERE steam_id = $1', [steam_id]);

        if (existing.rows.length > 0) {
            await pool.query('UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE steam_id = $1', [steam_id]);
            return existing.rows[0];
        }

        const res = await pool.query(
            `INSERT INTO usuarios (steam_id, nombre_usuario, nombre, rol, steam_avatar)
             VALUES ($1, $2, $3, 'jugador', $4) RETURNING id, nombre_usuario, rol`,
            [steam_id, nombre_usuario, nombre, steam_avatar]
        );
        return res.rows[0];
    } catch (err) {
        console.error("Error insertando jugador:", err.message);
        throw err;
    }
}

// ==========================================
// FUNCIONES DE INTEGRACIÓN CON STEAM
// ==========================================

/**
 * Login que maneja tanto Steam como usuarios normales
 */
async function loginConSteam(req, res) {
    try {
        const { steamLogin = false } = req.body;

        if (steamLogin) {
            // Redirigir a Steam OAuth
            const steamAuthUrl = `/auth/steam`;

            res.json({
                success: true,
                steamAuth: true,
                authUrl: steamAuthUrl
            });

        } else {
            // Login normal
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
 * Obtener dashboard data para jugador
 */
async function getDashboardJugador(req, res) {
    try {
        const user = req.session.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }

        let dashboardData = {
            user: {
                nombre: user.nombre_usuario,
                avatar: user.avatar || null,
                rol: user.rol,
                steamId: user.steamId
            },
            steamConnected: !!user.steamId
        };

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

        if (!supervisor || supervisor.rol !== 'supervisor') {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado'
            });
        }

        // Obtener todos los jugadores
        const jugadoresResult = await pool.query(
            'SELECT id, nombre, nombre_usuario, steam_id, steam_avatar, ultimo_login FROM usuarios WHERE rol = $1',
            ['jugador']
        );

        const jugadores = jugadoresResult.rows;

        res.json({
            success: true,
            data: {
                supervisor: {
                    nombre: supervisor.nombre_usuario,
                    avatar: supervisor.avatar
                },
                jugadores: jugadores,
                estadisticas: {
                    totalJugadores: jugadores.length,
                    jugadoresConSteam: jugadores.filter(j => j.steam_id).length,
                    jugadoresActivos: jugadores.filter(j => {
                        if (!j.ultimo_login) return false;
                        const lastLogin = new Date(j.ultimo_login);
                        const today = new Date();
                        const diffTime = Math.abs(today - lastLogin);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays <= 7;
                    }).length
                }
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
// EXPORTAR FUNCIONES
// ==========================================

export {
    loginNormal,
    registroNormal,
    loginConSteam,
    getDashboardJugador,
    getDashboardSupervisor,
    checkUserExists,
    insertSupervisor,
    insertJugador
};
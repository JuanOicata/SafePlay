import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from 'dotenv';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
const PgSession = pgSession(session);
import passport from 'passport';
import SteamStrategy from 'passport-steam';
import pkg from "pg";
import bcrypt from 'bcryptjs';
import steamRoutes from './routes/steam.js';
const { Pool } = pkg;


// test-env.js (en la raíz)
import 'dotenv/config';
console.log('STEAM_API_KEY:', process.env.STEAM_API_KEY);
console.log('DB_HOST:', process.env.DB_HOST);

// En steamService.js
import axios from 'axios';
import https from 'https';

// Solo para desarrollo local
const httpsAgent = process.env.NODE_ENV !== 'production'
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

const axiosInstance = axios.create({
    httpsAgent,
    timeout: 10000
});

// Usa axiosInstance en lugar de axios para las llamadas a Steam
// Cargar variables de entorno
dotenv.config();

// Configuración para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// 🔥 MIDDLEWARES PRIMERO - MUY IMPORTANTE EL ORDEN
console.log('🔧 Configurando middlewares...');

// Body parsing DEBE ir ANTES de las rutas
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, "public")));
app.use('/javascripts', express.static(path.join(__dirname, 'public', 'javascripts')));
app.use('/stylesheets', express.static(path.join(__dirname, 'public', 'stylesheets')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/api/steam', steamRoutes);
// Configurar base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Middleware de debug para ver qué llega en req.body
app.use('/login', (req, res, next) => {
    console.log('🔍 DEBUG LOGIN - Content-Type:', req.get('Content-Type'));
    console.log('🔍 DEBUG LOGIN - req.body:', req.body);
    console.log('🔍 DEBUG LOGIN - req.method:', req.method);
    next();
});

// Sesiones
app.use(session({
    store: new PgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-super-segura-123456789',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Cambiado temporalmente para debug
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Steam Strategy
if (process.env.STEAM_API_KEY) {
    console.log('🎮 Configurando Steam Strategy...');
    passport.use(new SteamStrategy({
        returnURL: process.env.STEAM_RETURN_URL || `http://localhost:${PORT}/auth/steam/return`,
        realm: process.env.STEAM_REALM || `http://localhost:${PORT}/`,
        apiKey: process.env.STEAM_API_KEY
    }, async (identifier, profile, done) => {
        try {
            const steamUser = {
                steam_id: profile.id,
                nombre_usuario: profile.displayName,
                nombre: profile.displayName,
                steam_avatar: profile.photos[2]?.value || profile.photos[0]?.value || ''
            };
            return done(null, steamUser);
        } catch (error) {
            return done(error, null);
        }
    }));
}

// Serialización
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// 🔥 RUTAS - DESPUÉS DE TODOS LOS MIDDLEWARES

console.log('🛣️  Configurando rutas...');

// Login de supervisores Y jugadores
app.post('/login', async (req, res) => {
    try {
        console.log('🔑 Iniciando sesión...');
        console.log('📦 req.body recibido:', JSON.stringify(req.body, null, 2));

        // Verificar que req.body existe
        if (!req.body) {
            console.log('❌ req.body es undefined o null');
            return res.status(400).json({
                success: false,
                message: 'No se recibieron datos en el cuerpo de la petición'
            });
        }

        const { usuario, password } = req.body;

        console.log('👤 Usuario:', usuario);
        console.log('🔐 Password recibido:', password ? 'SÍ' : 'NO');

        if (!usuario || !password) {
            console.log('❌ Faltan datos obligatorios');
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son obligatorios'
            });
        }

        // Buscar usuario por nombre_usuario o email
        console.log('🔍 Buscando usuario en BD...');
        const result = await pool.query(
            `SELECT * FROM usuarios
             WHERE nombre_usuario = $1 OR email = $1`,
            [usuario]
        );

        console.log('📊 Resultados de búsqueda:', result.rows.length);

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = result.rows[0];
        console.log('👤 Usuario encontrado:', {
            id: user.id,
            nombre_usuario: user.nombre_usuario,
            rol: user.rol,
            tiene_password: !!user.password
        });

        // Validar contraseña
        const match = await bcrypt.compare(password, user.password || '');
        console.log('🔐 Contraseña válida:', match);

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

        console.log('✅ Login exitoso, redirigiendo...');

        const redirectUrl = user.rol === 'supervisor'
            ? '/dashboard-supervisor.html'
            : user.steam_id
                ? `/dashboard-jugador.html?steam_id=${user.steam_id}`
                : '/dashboard-jugador.html';

        return res.json({
            success: true,
            message: 'Login exitoso',
            user: {
                id: user.id,
                nombre_usuario: user.nombre_usuario,
                rol: user.rol,
                steamId: user.steam_id
            },
            redirectUrl: redirectUrl
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        console.error('❌ Stack trace:', error.stack);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Registro de supervisores
app.post('/registro', async (req, res) => {
    try {
        console.log('📝 Iniciando registro...');
        console.log('📦 req.body:', JSON.stringify(req.body, null, 2));

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

        console.log('✅ Usuario registrado exitosamente');

        res.json({
            success: true,
            message: 'Supervisor registrado exitosamente',
            redirectUrl: '/login.html'
        });

    } catch (error) {
        console.error('❌ Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// RUTAS DE STEAM
app.use('/api/steam', steamRoutes);

// Ruta específica que usa el frontend para obtener URL de Steam
app.get('/api/steam/auth-url', (req, res) => {
    if (!process.env.STEAM_API_KEY) {
        return res.status(400).json({
            success: false,
            message: 'Steam no está configurado en el servidor'
        });
    }

    const authUrl = '/auth/steam';
    res.json({
        success: true,
        url: authUrl
    });
});

// Steam OAuth routes
if (process.env.STEAM_API_KEY) {
    app.get('/auth/steam', passport.authenticate('steam'));

    app.get('/auth/steam/return',
        passport.authenticate('steam', { failureRedirect: '/login.html' }),
        async (req, res) => {
            try {
                console.log('🎮 Steam callback recibido:', req.user);

                const existingUser = await checkUserExists('steam_id', req.user.steam_id);

                if (!existingUser) {
                    console.log('👤 Creando nuevo usuario de Steam...');
                    await insertJugador(
                        req.user.steam_id,
                        req.user.nombre_usuario,
                        req.user.nombre,
                        req.user.steam_avatar
                    );
                }

                // Establecer sesión para el usuario de Steam
                req.session.user = {
                    steamId: req.user.steam_id,
                    nombre_usuario: req.user.nombre_usuario,
                    avatar: req.user.steam_avatar,
                    rol: 'jugador'
                };

                console.log('✅ Sesión Steam establecida, redirigiendo...');
                res.redirect(`/dashboard-jugador.html?steam_id=${req.user.steam_id}`);
            } catch (error) {
                console.error('❌ Error Steam callback:', error);
                res.redirect('/login.html?error=steam-error');
            }
        }
    );
}

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
        }
        res.json({ success: true, message: 'Sesión cerrada correctamente' });
    });
});

// Middleware para proteger rutas del dashboard
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login.html');
    }
    next();
};

// Rutas básicas
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/registro.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "registro.html"));
});

app.get("/login.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/dashboard-jugador.html", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard-jugador.html"));
});

app.get("/dashboard-supervisor.html", requireAuth, (req, res) => {
    if (req.session.user.rol !== 'supervisor') {
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, "public", "dashboard-supervisor.html"));
});

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
    });
});

// Test route
app.get("/test", (req, res) => {
    res.send("🚀 El servidor está vivo y responde correctamente");
});

// Error handler - 404
app.use((req, res) => {
    console.log('❌ 404 - Ruta no encontrada:', req.url);
    res.status(404).json({ error: 'Página no encontrada', path: req.url });
});

// Error handler general
app.use((error, req, res, next) => {
    console.error('❌ Error general:', error);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
});

// FUNCIONES DE BASE DE DATOS
async function initializeDatabase() {
    try {
        console.log('🗃️  Inicializando base de datos...');

        // Test connection first
        await pool.query("SELECT 1");
        console.log("✅ Conexión DB establecida");

        // Tabla usuarios
        const checkUsuarios = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'usuarios'
            );
        `);

        if (!checkUsuarios.rows[0].exists) {
            await pool.query(`
                CREATE TABLE usuarios (
                                          id SERIAL PRIMARY KEY,
                                          nombre VARCHAR(100),
                                          nombre_usuario VARCHAR(50) UNIQUE,
                                          email VARCHAR(100) UNIQUE,
                                          telefono VARCHAR(15),
                                          cedula VARCHAR(20),
                                          rol VARCHAR(20) NOT NULL CHECK (rol IN ('jugador', 'supervisor')),
                                          password VARCHAR(255),
                                          steam_id VARCHAR(50) UNIQUE,
                                          steam_avatar TEXT,
                                          activo BOOLEAN DEFAULT true,
                                          ultimo_login TIMESTAMP,
                                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log("✅ Tabla usuarios creada");
        } else {
            console.log("ℹ️  Tabla usuarios ya existe");
        }

        // Tabla session
        const checkSession = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'session'
            );
        `);

        if (!checkSession.rows[0].exists) {
            await pool.query(`
                CREATE TABLE "session" (
                                           "sid" varchar NOT NULL COLLATE "default",
                                           "sess" json NOT NULL,
                                           "expire" timestamp(6) NOT NULL,
                                           CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
                )
            `);

            await pool.query(`CREATE INDEX "IDX_session_expire" ON "session" ("expire")`);
            console.log("✅ Tabla session creada");
        } else {
            console.log("ℹ️  Tabla session ya existe");
        }

    } catch (err) {
        console.error("❌ Error DB:", err.message);
        throw err;
    }
}

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

// Inicializar servidor
const startServer = async () => {
    try {
        console.log('🚀 Iniciando SafePlay Server...');

        await initializeDatabase();

        app.listen(PORT, () => {
            console.log(`🌟 ========================================`);
            console.log(`🚀 Servidor SafePlay INICIADO`);
            console.log(`📍 Puerto: ${PORT}`);
            console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🎮 Steam API: ${process.env.STEAM_API_KEY ? 'Configurada ✅' : 'No configurada ❌'}`);
            console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Conectada ✅' : 'No configurada ❌'}`);
            console.log(`🔐 Session Secret: ${process.env.SESSION_SECRET ? 'Configurado ✅' : 'Usando fallback ⚠️'}`);
            console.log(`🌟 ========================================`);
        });

    } catch (error) {
        console.error('❌ Error crítico iniciando servidor:', error);
        process.exit(1);
    }
};

startServer();

export default app;
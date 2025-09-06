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

// Importar controladores
import {
    loginNormal,
    registroNormal,
    getDashboardJugador,
    getDashboardSupervisor,
    checkUserExists,
    insertJugador
} from './controladores/usuarioControlador.js';

const { Pool } = pkg;

// Cargar variables de entorno
dotenv.config();

// Configuración para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// 🔥 MIDDLEWARES PRIMERO - ANTES QUE TODO
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, "public")));
app.use('/javascripts', express.static(path.join(__dirname, 'public', 'javascripts')));
app.use('/stylesheets', express.static(path.join(__dirname, 'public', 'stylesheets')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Configurar base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Sesiones - DESPUÉS de middlewares básicos
app.use(session({
    store: new PgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Steam Strategy
if (process.env.STEAM_API_KEY) {
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

// Login usando el controlador
app.post('/login', loginNormal);

// Registro usando el controlador
app.post('/registro', registroNormal);

// API Dashboard
app.get('/api/dashboard/jugador', getDashboardJugador);
app.get('/api/dashboard/supervisor', getDashboardSupervisor);

// RUTAS DE STEAM
app.use('/api/steam', steamRoutes);

// Steam OAuth routes
if (process.env.STEAM_API_KEY) {
    app.get('/auth/steam', passport.authenticate('steam'));

    app.get('/auth/steam/return',
        passport.authenticate('steam', { failureRedirect: '/login.html' }),
        async (req, res) => {
            try {
                const existingUser = await checkUserExists('steam_id', req.user.steam_id);

                if (!existingUser) {
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

                res.redirect(`/dashboard-jugador.html?steam_id=${req.user.steam_id}`);
            } catch (error) {
                console.error('Error Steam callback:', error);
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

app.get("/dashboard-jugador.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard-jugador.html"));
});

app.get("/dashboard-supervisor.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard-supervisor.html"));
});

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Test route
app.get("/test", (req, res) => {
    res.send("🚀 El servidor está vivo y responde correctamente");
});

// Error handler - 404
app.use((req, res) => {
    res.status(404).send('Página no encontrada');
});

// FUNCIONES DE BASE DE DATOS
async function initializeDatabase() {
    try {
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
        }

        // Test connection
        await pool.query("SELECT 1");
        console.log("✅ Conexión DB establecida");
    } catch (err) {
        console.error("❌ Error DB:", err.message);
    }
}

// Inicializar servidor
const startServer = async () => {
    try {
        await initializeDatabase();

        app.listen(PORT, () => {
            console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
            console.log(`📍 Entorno: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🎮 Steam API: ${process.env.STEAM_API_KEY ? 'Configurada ✅' : 'No configurada ❌'}`);
            console.log(`🌐 Servidor corriendo en: http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
};

startServer();
export default app;
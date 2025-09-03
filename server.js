import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from 'dotenv';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
const PgSession = pgSession(session);import passport from 'passport';
import SteamStrategy from 'passport-steam';
import pkg from "pg";
import bcrypt from 'bcrypt';

const { Pool } = pkg;

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar base de datos directamente aquí
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Crear tabla si no existe
async function initializeDatabase() {
    try {
        const checkTable = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'usuarios'
            );
        `);

        if (!checkTable.rows[0].exists) {
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
            console.log("Tabla usuarios creada");
        }

        // Test connection
        await pool.query('SELECT 1');
        console.log("Conexión DB establecida");

    } catch (err) {
        console.error("Error DB:", err.message);
    }
}

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sesiones
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

// Archivos estáticos
app.use(express.static(path.join(__dirname, "src", "public")));

// Rutas básicas
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "public", "index.html"));
});

app.get("/registro.html", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "public", "registro.html"));
});

app.get("/login.html", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "public", "login.html"));
});

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Funciones de base de datos directas
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

                res.redirect('/dashboard-jugador.html');
            } catch (error) {
                console.error('Error Steam callback:', error);
                res.redirect('/login.html?error=steam-error');
            }
        }
    );
}

// Registro de supervisores
app.post('/registro', async (req, res) => {
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
});

// Error handler
app.use((req, res) => {
    res.status(404).send('Página no encontrada');
});

// Inicializar servidor
const startServer = async () => {
    try {
        await initializeDatabase();

        app.listen(PORT, () => {
            console.log(`Servidor iniciado en puerto ${PORT}`);
            console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Steam API: ${process.env.STEAM_API_KEY ? 'Configurada' : 'No configurada'}`);
        });

    } catch (error) {
        console.error('Error iniciando servidor:', error);
        process.exit(1);
    }
};

startServer();

app.get("/test", (req, res) => {
    res.send("🚀 El servidor está vivo y responde correctamente");
});
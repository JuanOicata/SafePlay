import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import SteamStrategy from 'passport-steam';

// Importar rutas (ajustar ruta según tu estructura)
import indexRoutes from '../routes/index.js';
import userRoutes from '../routes/users.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Necesario para usar __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'tu-clave-secreta-muy-segura',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Configurar Passport
app.use(passport.initialize());
app.use(passport.session());

// Configurar estrategia de Steam
passport.use(new SteamStrategy({
    returnURL: process.env.STEAM_RETURN_URL || `http://localhost:${PORT}/auth/steam/return`,
    realm: process.env.STEAM_REALM || `http://localhost:${PORT}/`,
    apiKey: process.env.STEAM_API_KEY
}, async (identifier, profile, done) => {
    try {
        // Aquí procesaremos el usuario de Steam
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

// Serialización de usuario para sesiones
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Usar las rutas
app.use('/', indexRoutes);
app.use('/users', userRoutes);

// Rutas de autenticación Steam
app.get('/auth/steam', passport.authenticate('steam'));

app.get('/auth/steam/return',
    passport.authenticate('steam', { failureRedirect: '/login.html' }),
    async (req, res) => {
        try {
            // Importar función de inserción de jugador
            const { insertJugador } = await import('./services/db.js');

            // Verificar si el usuario ya existe
            const existingUser = await checkUserExists('steam_id', req.user.steam_id);

            if (!existingUser) {
                // Crear nuevo jugador
                await insertJugador(
                    req.user.steam_id,
                    req.user.nombre_usuario,
                    req.user.nombre,
                    req.user.steam_avatar
                );
            }

            // Redirigir al dashboard del jugador
            res.redirect('/dashboard-jugador.html');
        } catch (error) {
            console.error('Error en callback Steam:', error);
            res.redirect('/login.html?error=steam-error');
        }
    }
);

// Ruta de registro tradicional para supervisores
app.post('/registro', async (req, res) => {
    try {
        const { nombre, usuario, correo, telefono, cedula, rol, password, confirmPassword } = req.body;

        // Validaciones básicas
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

        // Importar funciones de base de datos
        const { insertSupervisor, checkUserExists } = await import('./services/db.js');
        const bcrypt = await import('bcrypt');

        // Verificar si el usuario ya existe
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

        // Encriptar contraseña
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insertar supervisor
        const newUser = await insertSupervisor(
            nombre,
            usuario,
            correo,
            telefono,
            cedula,
            hashedPassword
        );

        // Respuesta exitosa
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

// Ruta de logout
app.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
        }
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error al destruir sesión' });
            }
            res.json({ success: true, message: 'Sesión cerrada exitosamente' });
        });
    });
});

// Función helper para verificar usuarios existentes
async function checkUserExists(field, value) {
    const { pool } = await import('./services/db.js');
    try {
        const result = await pool.query(`SELECT * FROM usuarios WHERE ${field} = $1`, [value]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error verificando usuario:', error);
        return null;
    }
}

// Ruta principal
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Health check para Railway
app.get("/health", (req, res) => res.send("OK"));

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`Steam Return URL: ${process.env.STEAM_RETURN_URL || `http://localhost:${PORT}/auth/steam/return`}`);
});
import "dotenv/config";
import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Función para crear tablas necesarias (usuarios + session)
export async function createTables() {
    try {
        // Verificar tabla usuarios
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
            console.log("✅ Tabla usuarios creada exitosamente");
        } else {
            console.log("✅ Tabla usuarios ya existe");
        }

        // Verificar tabla session
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

            console.log("✅ Tabla session creada exitosamente");
        } else {
            console.log("✅ Tabla session ya existe");
        }

        // Probar conexión
        await pool.query("SELECT 1");
        console.log("✅ Conexión a la base de datos establecida");
    } catch (err) {
        console.error("❌ Error en la base de datos:", err.message);
        throw err;
    }
}


// Inserción para usuario supervisor (registro tradicional)
export async function insertSupervisor(nombre, nombre_usuario, email, telefono, cedula, password) {
    try {
        console.log("🔄 Insertando supervisor:", nombre_usuario);

        const res = await pool.query(
            `INSERT INTO usuarios
                 (nombre, nombre_usuario, email, telefono, cedula, rol, password)
             VALUES ($1, $2, $3, $4, $5, 'supervisor', $6) RETURNING id, nombre_usuario, email, rol`,
            [nombre, nombre_usuario, email, telefono, cedula, password]
        );

        console.log("✅ Supervisor insertado exitosamente:", res.rows[0]);
        return res.rows[0];
    } catch (err) {
        console.error("❌ Error insertando supervisor:", err.message);
        if (err.code === '23505') { // Código de error para violación de unique constraint
            throw new Error('El usuario o email ya existe');
        }
        throw err;
    }
}

// Inserción para usuario jugador (registro vía Steam)
export async function insertJugador(steam_id, nombre_usuario, nombre, steam_avatar) {
    try {
        console.log("🔄 Procesando jugador Steam:", nombre_usuario);

        // Verificar si ya existe
        const existing = await pool.query(
            'SELECT * FROM usuarios WHERE steam_id = $1',
            [steam_id]
        );

        if (existing.rows.length > 0) {
            console.log("ℹ️  Jugador ya existe, actualizando último login");
            // Actualizar último login
            await pool.query(
                'UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE steam_id = $1',
                [steam_id]
            );
            return existing.rows[0];
        }

        // Crear nuevo usuario
        const res = await pool.query(
            `INSERT INTO usuarios
                 (steam_id, nombre_usuario, nombre, rol, steam_avatar)
             VALUES ($1, $2, $3, 'jugador', $4) RETURNING id, nombre_usuario, rol`,
            [steam_id, nombre_usuario, nombre, steam_avatar]
        );

        console.log("✅ Jugador creado exitosamente:", res.rows[0]);
        return res.rows[0];
    } catch (err) {
        console.error("❌ Error procesando jugador:", err.message);
        throw err;
    }
}

// Función para verificar si un usuario existe
export async function checkUserExists(field, value) {
    try {
        const allowedFields = ['nombre_usuario', 'email', 'steam_id', 'cedula'];
        if (!allowedFields.includes(field)) {
            throw new Error('Campo no permitido para búsqueda');
        }

        const res = await pool.query(
            `SELECT * FROM usuarios WHERE ${field} = $1`,
            [value]
        );
        return res.rows[0] || null;
    } catch (err) {
        console.error("❌ Error verificando usuario:", err.message);
        return null;
    }
}

// Función para obtener usuario por ID
export async function getUserById(id) {
    try {
        const res = await pool.query(
            'SELECT * FROM usuarios WHERE id = $1',
            [id]
        );
        return res.rows[0] || null;
    } catch (err) {
        console.error("❌ Error obteniendo usuario:", err.message);
        return null;
    }
}

// Función para login tradicional
export async function loginUser(nombre_usuario, password) {
    try {
        // Importar bcryptjs dinámicamente
        const bcryptModule = await import("bcryptjs");
        const bcrypt = bcryptModule.default;

        const res = await pool.query(
            "SELECT * FROM usuarios WHERE nombre_usuario = $1 AND rol = $2",
            [nombre_usuario, "supervisor"]
        );

        if (res.rows.length === 0) {
            return null;
        }

        const user = res.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (validPassword) {
            // Actualizar último login
            await pool.query(
                "UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1",
                [user.id]
            );
            console.log("✅ Login exitoso para:", nombre_usuario);
            return user;
        }

        return null;
    } catch (err) {
        console.error("❌ Error en login:", err.message);
        return null;
    }
}


createTables().catch(err => {
    console.error("❌ Error fatal en inicialización de DB:", err.message);
});

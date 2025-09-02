import "dotenv/config";
import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Función para crear tabla (solo ejecutar una vez)
export async function createTable() {
    try {
        // Verificar si la tabla existe
        const checkTable = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'usuarios'
            );
        `);

        if (!checkTable.rows[0].exists) {
            // Crear tabla solo si no existe
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
            console.log("Tabla usuarios creada ✅");
        } else {
            console.log("Tabla usuarios ya existe ✅");
        }
    } catch (err) {
        console.error("Error en DB:", err);
        throw err;
    }
}

// Inserción para usuario supervisor (registro tradicional)
export async function insertSupervisor(nombre, nombre_usuario, email, telefono, cedula, password) {
    try {
        const res = await pool.query(
            `INSERT INTO usuarios
                 (nombre, nombre_usuario, email, telefono, cedula, rol, password)
             VALUES ($1, $2, $3, $4, $5, 'supervisor', $6) RETURNING *`,
            [nombre, nombre_usuario, email, telefono, cedula, password]
        );
        console.log("Supervisor insertado:", res.rows[0].id);
        return res.rows[0];
    } catch (err) {
        console.error("Error insertando supervisor:", err);
        if (err.code === '23505') { // Código de error para violación de unique constraint
            throw new Error('El usuario ya existe');
        }
        throw err;
    }
}

// Inserción para usuario jugador (registro vía Steam)
export async function insertJugador(steam_id, nombre_usuario, nombre, steam_avatar) {
    try {
        // Verificar si ya existe
        const existing = await pool.query(
            'SELECT * FROM usuarios WHERE steam_id = $1',
            [steam_id]
        );

        if (existing.rows.length > 0) {
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
             VALUES ($1, $2, $3, 'jugador', $4) RETURNING *`,
            [steam_id, nombre_usuario, nombre, steam_avatar]
        );
        console.log("Jugador insertado vía Steam:", res.rows[0].id);
        return res.rows[0];
    } catch (err) {
        console.error("Error insertando jugador:", err);
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
        console.error("Error verificando usuario:", err);
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
        console.error("Error obteniendo usuario:", err);
        return null;
    }
}

// Función para login tradicional
export async function loginUser(nombre_usuario, password) {
    try {
        const bcrypt = await import('bcrypt');

        const res = await pool.query(
            'SELECT * FROM usuarios WHERE nombre_usuario = $1 AND rol = $2',
            [nombre_usuario, 'supervisor']
        );

        if (res.rows.length === 0) {
            return null;
        }

        const user = res.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (validPassword) {
            // Actualizar último login
            await pool.query(
                'UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );
            return user;
        }

        return null;
    } catch (err) {
        console.error("Error en login:", err);
        return null;
    }
}

// Inicializar tabla al importar el módulo
createTable().catch(console.error);
import "dotenv/config";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // importante en Railway
});

async function createTable() {
    try {
        // 🔹 Borrar la tabla si existe (para reiniciar)
        await pool.query(`DROP TABLE IF EXISTS usuarios`);

        // 🔹 Crear tabla limpia con las columnas correctas
        await pool.query(`
            CREATE TABLE usuarios (
                                      id SERIAL PRIMARY KEY,
                                      nombre VARCHAR(100) NOT NULL,
                                      nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
                                      email VARCHAR(100) UNIQUE NOT NULL,
                                      telefono VARCHAR(15) NOT NULL,
                                      cedula VARCHAR(20) UNIQUE NOT NULL,
                                      rol VARCHAR(20) NOT NULL CHECK (rol IN ('jugador', 'supervisor')),
                                      password VARCHAR(255) NOT NULL
            )
        `);

        console.log("Tabla usuarios recreada ✅");
    } catch (err) {
        console.error("Error en DB:", err);
    }
}

async function insertUser(nombre, nombre_usuario, email, telefono, cedula, rol, password) {
    try {
        const res = await pool.query(
            `INSERT INTO usuarios 
             (nombre, nombre_usuario, email, telefono, cedula, rol, password) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [nombre, nombre_usuario, email, telefono, cedula, rol, password]
        );
        console.log("Usuario insertado:", res.rows[0]);
    } catch (err) {
        console.error("Error insertando usuario:", err);
    }
}

async function main() {
    await createTable();

    // 🔹 Inserta un usuario de prueba
    await insertUser(
        "Juan Pérez",
        "juanp",
        "juan@example.com",
        "3124567890",
        "123456789",
        "jugador",
        "claveSegura123"
    );

    await pool.end();
}

main();

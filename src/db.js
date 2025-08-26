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
        email VARCHAR(100) UNIQUE NOT NULL
      )
    `);

        console.log("Tabla usuarios recreada ✅");
    } catch (err) {
        console.error("Error en DB:", err);
    }
}

async function insertUser(nombre, email) {
    try {
        const res = await pool.query(
            "INSERT INTO usuarios (nombre, email) VALUES ($1, $2) RETURNING *",
            [nombre, email]
        );
        console.log("Usuario insertado:", res.rows[0]);
    } catch (err) {
        console.error("Error insertando usuario:", err);
    }
}

async function main() {
    await createTable();

    // 🔹 Inserta un usuario de prueba
    await insertUser("Juan", "juan@example.com");

    await pool.end();
}

main();

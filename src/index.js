
import express from "express";
import dotenv from "dotenv";
import pool from "./db.js";

dotenv.config();
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("🚀 SafePlay API funcionando");
});

// Ruta para probar PostgreSQL
app.get("/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({ db_time: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error conectando a la base de datos");
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

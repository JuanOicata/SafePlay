import express from 'express';
const router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

export default router;

var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;

// Importar funciones actualizadas
const {
  registroConSteam,
  loginConSteam,
  getDashboardJugador,
  getDashboardSupervisor
} = require('../../../controladores/usuarioControlador.js');

// Actualizar rutas existentes
app.post('/api/registro', registroConSteam);
app.post('/api/login', loginConSteam);

// Nuevas rutas de dashboard
app.get('/api/dashboard-jugador', requireAuth, getDashboardJugador);
app.get('/api/dashboard-supervisor', requireAuth, getDashboardSupervisor);
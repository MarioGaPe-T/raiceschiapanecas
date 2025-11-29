// routes/profile.js
const express = require('express');
const path = require('path');
const profileController = require('../controllers/profileController');

const router = express.Router();

// Página HTML del perfil
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/profile.html'));
});

// Datos del perfil (GET y PUT)
router.get('/data', profileController.getProfileData);
router.put('/data', profileController.updateProfile);

// Cambio de contraseña
router.put('/password', profileController.changePassword);

// Dirección de envío (upsert)
router.put('/address', profileController.upsertShippingAddress);

module.exports = router;

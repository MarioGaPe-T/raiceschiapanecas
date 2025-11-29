// routes/producers.js
const express = require('express');
const path = require('path');
const producersController = require('../controllers/producersController');

const router = express.Router();

// Panel HTML
router.get('/panel', (req, res) => {
  const filePath = path.join(__dirname, '../views/producers.html');
  res.sendFile(filePath);
});

// API JSON
router.get('/', producersController.list);
router.get('/:id', producersController.getById);
router.post('/', producersController.create);
router.put('/:id', producersController.update);
router.delete('/:id', producersController.remove);

module.exports = router;

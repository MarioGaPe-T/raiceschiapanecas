// routes/categories.js
const express = require('express');
const path = require('path');
const categoriesController = require('../controllers/categoriesController');

const router = express.Router();

// Panel HTML (debe ir antes de los :id)
router.get('/panel', (req, res) => {
  const filePath = path.join(__dirname, '../views/categories.html');
  res.sendFile(filePath);
});

// API JSON CRUD
router.get('/', categoriesController.list);
router.get('/:id', categoriesController.getById);
router.post('/', categoriesController.create);
router.put('/:id', categoriesController.update);
router.delete('/:id', categoriesController.remove);

module.exports = router;

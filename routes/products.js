// routes/products.js
const express = require('express');
const path = require('path');
const productController = require('../controllers/productController');

const router = express.Router();

// Panel HTML
router.get('/panel', (req, res) => {
  const filePath = path.join(__dirname, '../views/products.html');
  res.sendFile(filePath);
});

// API JSON
router.get('/meta', productController.getMeta);
router.get('/', productController.listProducts);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;

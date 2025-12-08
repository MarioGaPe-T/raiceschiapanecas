// routes/products.js
const express = require('express');
const path = require('path');
const multer = require('multer');
const productsController = require('../controllers/productsController');

const router = express.Router();

/* ===========================
   Configuración de Multer
   =========================== */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads/products'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${unique}${ext}`);
  },
});

const upload = multer({ storage });

/* ===========================
   Rutas de vistas (HTML)
   =========================== */

// Listado de productos (panel principal)
router.get('/panel', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/products.html'));
});

// Formulario para crear producto
router.get('/new', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/product-form.html'));
});

// Formulario para editar producto
router.get('/:id/edit', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/product-form.html'));
});

/* ===========================
   API JSON de productos
   =========================== */

// Metadatos para selects (categorías + productores)
router.get('/meta', productsController.getMeta);

// CRUD JSON
router.get('/', productsController.list);         // GET /products
router.get('/:id', productsController.getById);   // GET /products/:id
router.post('/', productsController.create);      // POST /products
router.put('/:id', productsController.update);    // PUT /products/:id
router.delete('/:id', productsController.remove); // DELETE /products/:id

/* ===========================
   Imágenes de productos
   =========================== */

// Listar imágenes de un producto
router.get('/:id/images', productsController.listImages);

// Subir imágenes (una o varias) para un producto
router.post(
  '/:id/images',
  upload.array('images', 5),
  productsController.uploadImages
);

// Eliminar una imagen por id
router.delete('/images/:imageId', productsController.deleteImage);

// Marcar una imagen como principal
router.put('/images/:imageId/primary', productsController.setPrimaryImage);

module.exports = router;

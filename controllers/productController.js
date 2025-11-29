// controllers/productController.js
const productService = require('../services/productService');

// GET /products
exports.listProducts = (req, res) => {
  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    productService.getAll(conn, (err, products) => {
      if (err) {
        console.error('Error al obtener productos:', err);
        return res.status(500).json({ error: 'Error al obtener productos' });
      }

      res.json(products);
    });
  });
};

// GET /products/:id
exports.getProductById = (req, res) => {
  const { id } = req.params;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    productService.getById(conn, id, (err, product) => {
      if (err) {
        console.error('Error al obtener producto:', err);
        return res.status(500).json({ error: 'Error al obtener producto' });
      }

      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      res.json(product);
    });
  });
};

// POST /products
exports.createProduct = (req, res) => {
  const {
    category_id,
    producer_id,
    name,
    slug,
    sku,
    description,
    price,
    status,
    weight_grams
  } = req.body;

  if (!name || !category_id || !price) {
    return res.status(400).json({
      error: 'name, category_id y price son obligatorios'
    });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    const data = {
      category_id,
      producer_id: producer_id || null,
      name,
      slug,
      sku,
      description,
      price,
      status,
      weight_grams
    };

    productService.create(conn, data, (err, insertId) => {
      if (err) {
        console.error('Error al crear producto:', err);
        return res.status(500).json({ error: 'Error al crear producto' });
      }

      res.status(201).json({
        message: 'Producto creado correctamente',
        id: insertId
      });
    });
  });
};

// PUT /products/:id
exports.updateProduct = (req, res) => {
  const { id } = req.params;
  const {
    category_id,
    producer_id,
    name,
    slug,
    sku,
    description,
    price,
    status,
    weight_grams
  } = req.body;

  if (!name || !category_id || !price) {
    return res.status(400).json({
      error: 'name, category_id y price son obligatorios para actualizar'
    });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    const data = {
      category_id,
      producer_id: producer_id || null,
      name,
      slug,
      sku,
      description,
      price,
      status,
      weight_grams
    };

    productService.update(conn, id, data, (err, affectedRows) => {
      if (err) {
        console.error('Error al actualizar producto:', err);
        return res.status(500).json({ error: 'Error al actualizar producto' });
      }

      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      res.json({ message: 'Producto actualizado correctamente' });
    });
  });
};

// DELETE /products/:id
exports.deleteProduct = (req, res) => {
  const { id } = req.params;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    productService.remove(conn, id, (err, affectedRows) => {
      if (err) {
        console.error('Error al eliminar producto:', err);
        return res.status(500).json({ error: 'Error al eliminar producto' });
      }

      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      res.json({ message: 'Producto eliminado correctamente' });
    });
  });
};

// GET /products/meta
exports.getMeta = (req, res) => {
  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    productService.getMeta(conn, (err, meta) => {
      if (err) {
        console.error('Error al obtener meta de productos:', err);
        return res.status(500).json({ error: 'Error al obtener datos de catálogos' });
      }

      res.json(meta);
    });
  });
};

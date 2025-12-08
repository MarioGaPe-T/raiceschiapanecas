// controllers/productsController.js
const productService = require('../services/productService');
const productImageService = require('../services/productImageService');

/* ===========================
   Productos (JSON)
   =========================== */

exports.list = (req, res) => {
  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en productsController.list:', err);
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

exports.getMeta = (req, res) => {
  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en productsController.getMeta:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    productService.getMeta(conn, (err, meta) => {
      if (err) {
        console.error('Error al obtener meta de productos:', err);
        return res.status(500).json({ error: 'Error al obtener metadatos' });
      }

      res.json(meta); // { categories: [...], producers: [...] }
    });
  });
};

exports.getById = (req, res) => {
  const { id } = req.params;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en productsController.getById:', err);
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

exports.create = (req, res) => {
  const {
    category_id,
    producer_id,
    name,
    sku,
    description,
    price,
    status,
    weight_grams,
    stock_quantity,
  } = req.body;

  if (!category_id || !name || !price) {
    return res.status(400).json({
      error: 'category_id, name y price son obligatorios',
    });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en productsController.create:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    const data = {
      category_id,
      producer_id: producer_id || null,
      name,
      sku: sku || null,
      description: description || null,
      price,
      status: status || 'active',
      weight_grams: weight_grams || null,
      stock_quantity: stock_quantity !== undefined ? stock_quantity : null,
    };

    productService.create(conn, data, (err, insertId) => {
      if (err) {
        console.error('Error al crear producto:', err);
        return res.status(500).json({ error: 'Error al crear producto' });
      }

      res.status(201).json({
        message: 'Producto creado correctamente',
        id: insertId,
      });
    });
  });
};

exports.update = (req, res) => {
  const { id } = req.params;
  const {
    category_id,
    producer_id,
    name,
    sku,
    description,
    price,
    status,
    weight_grams,
    stock_quantity,
  } = req.body;

  if (!category_id || !name || !price) {
    return res.status(400).json({
      error: 'category_id, name y price son obligatorios para actualizar',
    });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en productsController.update:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    const data = {
      category_id,
      producer_id: producer_id || null,
      name,
      sku: sku || null,
      description: description || null,
      price,
      status: status || 'active',
      weight_grams: weight_grams || null,
      stock_quantity: stock_quantity !== undefined ? stock_quantity : null,
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

exports.remove = (req, res) => {
  const { id } = req.params;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en productsController.remove:', err);
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

/* ===========================
   Imágenes de productos
   =========================== */

exports.listImages = (req, res) => {
  const { id } = req.params;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en listImages:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    productImageService.getByProduct(conn, id, (err, images) => {
      if (err) {
        console.error('Error al obtener imágenes:', err);
        return res.status(500).json({ error: 'Error al obtener imágenes' });
      }

      res.json(images);
    });
  });
};

exports.uploadImages = (req, res) => {
  const { id } = req.params;
  const files = req.files || [];

  if (!files.length) {
    return res.status(400).json({ error: 'No se enviaron imágenes' });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en uploadImages:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    const images = files.map((file, index) => ({
      url: `/uploads/products/${file.filename}`,
      alt: file.originalname,
      // Si no hay imágenes previas, podrías marcar la primera como principal
      is_primary: index === 0 ? 1 : 0,
    }));

    productImageService.createMany(conn, id, images, (err) => {
      if (err) {
        console.error('Error al guardar imágenes:', err);
        return res.status(500).json({ error: 'Error al guardar imágenes' });
      }

      res.status(201).json({ message: 'Imágenes subidas correctamente' });
    });
  });
};

exports.deleteImage = (req, res) => {
  const { imageId } = req.params;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en deleteImage:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    productImageService.remove(conn, imageId, (err, affectedRows) => {
      if (err) {
        console.error('Error al eliminar imagen:', err);
        return res.status(500).json({ error: 'Error al eliminar imagen' });
      }

      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Imagen no encontrada' });
      }

      res.json({ message: 'Imagen eliminada correctamente' });
    });
  });
};

exports.setPrimaryImage = (req, res) => {
  const { imageId } = req.params;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en setPrimaryImage:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    productImageService.setPrimary(conn, imageId, (err) => {
      if (err) {
        console.error('Error al marcar imagen como principal:', err);
        return res.status(500).json({ error: 'Error al marcar imagen como principal' });
      }

      res.json({ message: 'Imagen marcada como principal correctamente' });
    });
  });
};

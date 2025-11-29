// controllers/categoriesController.js
const categoryService = require('../services/categoryService');

// GET /categories
exports.list = (req, res) => {
  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    categoryService.getAll(conn, (err, categories) => {
      if (err) {
        console.error('Error al obtener categorías:', err);
        return res.status(500).json({ error: 'Error al obtener categorías' });
      }

      res.json(categories);
    });
  });
};

// GET /categories/:id
exports.getById = (req, res) => {
  const { id } = req.params;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    categoryService.getById(conn, id, (err, category) => {
      if (err) {
        console.error('Error al obtener categoría:', err);
        return res.status(500).json({ error: 'Error al obtener categoría' });
      }

      if (!category) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      res.json(category);
    });
  });
};

// POST /categories
exports.create = (req, res) => {
  const { parent_id, name, slug } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'El campo name es obligatorio' });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    categoryService.create(
      conn,
      { parent_id, name, slug },
      (err, insertId) => {
        if (err) {
          console.error('Error al crear categoría:', err);
          return res.status(500).json({ error: 'Error al crear categoría' });
        }

        res.status(201).json({
          message: 'Categoría creada correctamente',
          id: insertId,
        });
      }
    );
  });
};

// PUT /categories/:id
exports.update = (req, res) => {
  const { id } = req.params;
  const { parent_id, name, slug } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'El campo name es obligatorio para actualizar' });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    categoryService.update(
      conn,
      id,
      { parent_id, name, slug },
      (err, affectedRows) => {
        if (err) {
          console.error('Error al actualizar categoría:', err);
          return res.status(500).json({ error: 'Error al actualizar categoría' });
        }

        if (affectedRows === 0) {
          return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        res.json({ message: 'Categoría actualizada correctamente' });
      }
    );
  });
};

// DELETE /categories/:id
exports.remove = (req, res) => {
  const { id } = req.params;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    categoryService.remove(conn, id, (err, affectedRows) => {
      if (err) {
        console.error('Error al eliminar categoría:', err);
        return res.status(500).json({ error: 'Error al eliminar categoría' });
      }

      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      res.json({ message: 'Categoría eliminada correctamente' });
    });
  });
};

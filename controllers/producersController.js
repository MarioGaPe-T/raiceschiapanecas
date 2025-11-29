// controllers/producersController.js
const producerService = require('../services/producerService');

// GET /producers
exports.list = (req, res) => {
  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    producerService.getAll(conn, (err, producers) => {
      if (err) {
        console.error('Error al obtener productores:', err);
        return res.status(500).json({ error: 'Error al obtener productores' });
      }

      res.json(producers);
    });
  });
};

// GET /producers/:id
exports.getById = (req, res) => {
  const { id } = req.params;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    producerService.getById(conn, id, (err, producer) => {
      if (err) {
        console.error('Error al obtener productor:', err);
        return res.status(500).json({ error: 'Error al obtener productor' });
      }

      if (!producer) {
        return res.status(404).json({ error: 'Productor no encontrado' });
      }

      res.json(producer);
    });
  });
};

// POST /producers
exports.create = (req, res) => {
  const { name, description, contact_email, phone, region, active } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'El campo name es obligatorio' });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    producerService.create(
      conn,
      { name, description, contact_email, phone, region, active },
      (err, insertId) => {
        if (err) {
          console.error('Error al crear productor:', err);
          return res.status(500).json({ error: 'Error al crear productor' });
        }

        res.status(201).json({
          message: 'Productor creado correctamente',
          id: insertId,
        });
      }
    );
  });
};

// PUT /producers/:id
exports.update = (req, res) => {
  const { id } = req.params;
  const { name, description, contact_email, phone, region, active } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'El campo name es obligatorio para actualizar' });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    producerService.update(
      conn,
      id,
      { name, description, contact_email, phone, region, active },
      (err, affectedRows) => {
        if (err) {
          console.error('Error al actualizar productor:', err);
          return res.status(500).json({ error: 'Error al actualizar productor' });
        }

        if (affectedRows === 0) {
          return res.status(404).json({ error: 'Productor no encontrado' });
        }

        res.json({ message: 'Productor actualizado correctamente' });
      }
    );
  });
};

// DELETE /producers/:id
exports.remove = (req, res) => {
  const { id } = req.params;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    producerService.remove(conn, id, (err, affectedRows) => {
      if (err) {
        console.error('Error al eliminar productor:', err);
        return res.status(500).json({ error: 'Error al eliminar productor' });
      }

      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Productor no encontrado' });
      }

      res.json({ message: 'Productor eliminado correctamente' });
    });
  });
};

// controllers/customerController.js
const customerService = require('../services/customerService');

// GET /customers
exports.listCustomers = (req, res) => {
  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    customerService.getAll(conn, (err, customers) => {
      if (err) {
        console.error('Error al obtener clientes:', err);
        return res.status(500).json({ error: 'Error al obtener clientes' });
      }

      res.json(customers);
    });
  });
};

// GET /customers/:id
exports.getCustomerById = (req, res) => {
  const { id } = req.params;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    customerService.getById(conn, id, (err, customer) => {
      if (err) {
        console.error('Error al obtener cliente:', err);
        return res.status(500).json({ error: 'Error al obtener cliente' });
      }

      if (!customer) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      res.json(customer);
    });
  });
};

// PUT /customers/:id
exports.updateCustomer = (req, res) => {
  const { id } = req.params;
  const { full_name, email, phone } = req.body;

  if (!full_name || !email) {
    return res.status(400).json({
      error: 'full_name y email son obligatorios para actualizar',
    });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    customerService.update(conn, id, { full_name, email, phone }, (err, affectedRows) => {
      if (err) {
        console.error('Error al actualizar cliente:', err);
        return res.status(500).json({ error: 'Error al actualizar cliente' });
      }

      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      res.json({ message: 'Cliente actualizado correctamente' });
    });
  });
};

// DELETE /customers/:id
exports.deleteCustomer = (req, res) => {
  const { id } = req.params;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    customerService.remove(conn, id, (err, affectedRows) => {
      if (err) {
        console.error('Error al eliminar cliente:', err);
        return res.status(500).json({ error: 'Error al eliminar cliente' });
      }

      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      res.json({ message: 'Cliente eliminado correctamente' });
    });
  });
};

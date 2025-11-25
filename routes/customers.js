// routes/customers.js
const express = require('express');
const path = require('path');
const router = express.Router();

router.get('/panel', (req, res) => {
  const filePath = path.join(__dirname, '../views/customers.html');
  res.sendFile(filePath);
});

router.get('/', (req, res) => {
  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = `
      SELECT id, full_name, email, phone, created_at
      FROM customers
      ORDER BY id ASC
    `;

    conn.query(sql, (err, rows) => {
      if (err) {
        console.error('Error en la consulta:', err);
        return res.status(500).json({ error: 'Error al obtener clientes' });
      }

      res.json(rows);
    });
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = `
      SELECT id, full_name, email, phone, created_at
      FROM customers
      WHERE id = ?
      LIMIT 1
    `;

    conn.query(sql, [id], (err, rows) => {
      if (err) {
        console.error('Error en la consulta:', err);
        return res.status(500).json({ error: 'Error al obtener cliente' });
      }

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      res.json(rows[0]);
    });
  });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { full_name, email, phone } = req.body;

  if (!full_name || !email) {
    return res.status(400).json({
      error: 'full_name y email son obligatorios para actualizar'
    });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = `
      UPDATE customers
      SET full_name = ?, email = ?, phone = ?
      WHERE id = ?
    `;

    conn.query(sql, [full_name, email, phone || null, id], (err, result) => {
      if (err) {
        console.error('Error al actualizar cliente:', err);
        return res.status(500).json({ error: 'Error al actualizar cliente' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      res.json({ message: 'Cliente actualizado correctamente' });
    });
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = 'DELETE FROM customers WHERE id = ?';

    conn.query(sql, [id], (err, result) => {
      if (err) {
        console.error('Error al eliminar cliente:', err);
        return res.status(500).json({ error: 'Error al eliminar cliente' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      res.json({ message: 'Cliente eliminado correctamente' });
    });
  });
});

module.exports = router; 

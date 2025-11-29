// services/customerService.js
const Customer = require('../models/Customer');

// Obtener todos los clientes
exports.getAll = (conn, callback) => {
  const sql = `
    SELECT id, full_name, email, phone, created_at, role
    FROM customers
    ORDER BY id ASC
  `;

  conn.query(sql, (err, rows) => {
    if (err) return callback(err);
    const customers = rows.map(Customer.fromRow);
    callback(null, customers);
  });
};

// Obtener cliente por ID
exports.getById = (conn, id, callback) => {
  const sql = `
    SELECT id, full_name, email, phone, created_at, role
    FROM customers
    WHERE id = ?
    LIMIT 1
  `;

  conn.query(sql, [id], (err, rows) => {
    if (err) return callback(err);
    if (rows.length === 0) return callback(null, null);
    callback(null, Customer.fromRow(rows[0]));
  });
};

// Actualizar cliente (sin tocar password)
exports.update = (conn, id, data, callback) => {
  const { full_name, email, phone } = data;

  const sql = `
    UPDATE customers
    SET full_name = ?, email = ?, phone = ?
    WHERE id = ?
  `;

  conn.query(sql, [full_name, email, phone || null, id], (err, result) => {
    if (err) return callback(err);
    callback(null, result.affectedRows);
  });
};

// Eliminar cliente
exports.remove = (conn, id, callback) => {
  const sql = 'DELETE FROM customers WHERE id = ?';

  conn.query(sql, [id], (err, result) => {
    if (err) return callback(err);
    callback(null, result.affectedRows);
  });
};

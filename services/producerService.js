// services/producerService.js
const Producer = require('../models/producer');

// Obtener todos los productores
exports.getAll = (conn, callback) => {
  const sql = `
    SELECT
      id,
      name,
      description,
      contact_email,
      phone,
      region,
      active,
      created_at
    FROM producers
    ORDER BY id ASC
  `;

  conn.query(sql, (err, rows) => {
    if (err) return callback(err);

    // Aquí usamos Producer.fromRow de forma segura
    const producers = rows.map((row) => Producer.fromRow(row));
    callback(null, producers);
  });
};

// Obtener un productor por ID
exports.getById = (conn, id, callback) => {
  const sql = `
    SELECT
      id,
      name,
      description,
      contact_email,
      phone,
      region,
      active,
      created_at
    FROM producers
    WHERE id = ?
    LIMIT 1
  `;

  conn.query(sql, [id], (err, rows) => {
    if (err) return callback(err);

    if (rows.length === 0) {
      return callback(null, null);
    }

    const producer = Producer.fromRow(rows[0]);
    callback(null, producer);
  });
};

// Crear nuevo productor
exports.create = (conn, data, callback) => {
  const {
    name,
    description,
    contact_email,
    phone,
    region,
    active,
  } = data;

  const sql = `
    INSERT INTO producers (
      name,
      description,
      contact_email,
      phone,
      region,
      active
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const activeValue =
    typeof active === 'number'
      ? active
      : active
      ? 1
      : 0;

  conn.query(
    sql,
    [
      name,
      description || null,
      contact_email || null,
      phone || null,
      region || null,
      activeValue,
    ],
    (err, result) => {
      if (err) return callback(err);
      callback(null, result.insertId);
    }
  );
};

// Actualizar productor
exports.update = (conn, id, data, callback) => {
  const {
    name,
    description,
    contact_email,
    phone,
    region,
    active,
  } = data;

  const sql = `
    UPDATE producers
    SET
      name = ?,
      description = ?,
      contact_email = ?,
      phone = ?,
      region = ?,
      active = ?
    WHERE id = ?
  `;

  const activeValue =
    typeof active === 'number'
      ? active
      : active
      ? 1
      : 0;

  conn.query(
    sql,
    [
      name,
      description || null,
      contact_email || null,
      phone || null,
      region || null,
      activeValue,
      id,
    ],
    (err, result) => {
      if (err) return callback(err);
      callback(null, result.affectedRows);
    }
  );
};

// Eliminar productor
exports.remove = (conn, id, callback) => {
  const sql = 'DELETE FROM producers WHERE id = ?';

  conn.query(sql, [id], (err, result) => {
    if (err) return callback(err);
    callback(null, result.affectedRows);
  });
};

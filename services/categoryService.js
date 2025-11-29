// services/categoryService.js
const Category = require('../models/category');

// Helper simple para generar slugs a partir del nombre
function slugify(text) {
  return text
    .toString()
    .normalize('NFD')                     // quita acentos
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')          // todo lo raro -> guiones
    .replace(/(^-|-$)+/g, '');            // quita guiones al inicio/fin
}

// LIST: todas las categorías con nombre del padre (si tiene)
exports.getAll = (conn, cb) => {
  const sql = `
    SELECT 
      c.id,
      c.parent_id,
      c.name,
      c.slug,
      c.created_at,
      p.name AS parent_name
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    ORDER BY c.id ASC
  `;

  conn.query(sql, (err, rows) => {
    if (err) return cb(err);
    const categories = rows.map(Category.fromRow);
    cb(null, categories);
  });
};

// GET por id
exports.getById = (conn, id, cb) => {
  const sql = `
    SELECT 
      c.id,
      c.parent_id,
      c.name,
      c.slug,
      c.created_at,
      p.name AS parent_name
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    WHERE c.id = ?
    LIMIT 1
  `;

  conn.query(sql, [id], (err, rows) => {
    if (err) return cb(err);
    if (rows.length === 0) return cb(null, null);
    cb(null, Category.fromRow(rows[0]));
  });
};

// CREATE
exports.create = (conn, data, cb) => {
  let { parent_id, name, slug } = data;

  if (!name) {
    return cb(new Error('El campo name es obligatorio'));
  }

  if (!slug) {
    slug = slugify(name);
  }

  if (parent_id === '' || parent_id === null || parent_id === undefined) {
    parent_id = null;
  }

  const sql = `
    INSERT INTO categories (parent_id, name, slug)
    VALUES (?, ?, ?)
  `;

  conn.query(sql, [parent_id, name, slug], (err, result) => {
    if (err) return cb(err);
    cb(null, result.insertId);
  });
};

// UPDATE
exports.update = (conn, id, data, cb) => {
  let { parent_id, name, slug } = data;

  if (!name) {
    return cb(new Error('El campo name es obligatorio para actualizar'));
  }

  if (!slug) {
    slug = slugify(name);
  }

  if (parent_id === '' || parent_id === null || parent_id === undefined) {
    parent_id = null;
  }

  const sql = `
    UPDATE categories
    SET parent_id = ?, name = ?, slug = ?
    WHERE id = ?
  `;

  conn.query(sql, [parent_id, name, slug, id], (err, result) => {
    if (err) return cb(err);
    cb(null, result.affectedRows);
  });
};

// DELETE
exports.remove = (conn, id, cb) => {
  const sql = 'DELETE FROM categories WHERE id = ?';

  conn.query(sql, [id], (err, result) => {
    if (err) return cb(err);
    cb(null, result.affectedRows);
  });
};

// services/productService.js
const Product = require('../models/product');

// Helper para generar slug a partir del nombre
function slugify(str) {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .trim()
    // quitar acentos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // reemplazar cualquier cosa que no sea alfanumérico por -
    .replace(/[^a-z0-9]+/g, '-')
    // quitar guiones de los extremos
    .replace(/^-+|-+$/g, '');
}

// Obtener todos los productos (para admin o API interna)
exports.getAll = (conn, callback) => {
  const sql = `
    SELECT
      p.id,
      p.category_id,
      p.producer_id,
      p.name,
      p.slug,
      p.sku,
      p.description,
      p.price,
      p.status,
      p.weight_grams,
      p.created_at,
      c.name  AS category_name,
      pr.name AS producer_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN producers  pr ON p.producer_id = pr.id
    ORDER BY p.id ASC
  `;

  conn.query(sql, (err, rows) => {
    if (err) return callback(err);

    const products = rows.map(Product.fromRow);
    callback(null, products);
  });
};

// Obtener un producto por id
exports.getById = (conn, id, callback) => {
  const sql = `
    SELECT
      p.id,
      p.category_id,
      p.producer_id,
      p.name,
      p.slug,
      p.sku,
      p.description,
      p.price,
      p.status,
      p.weight_grams,
      p.created_at,
      c.name  AS category_name,
      pr.name AS producer_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN producers  pr ON p.producer_id = pr.id
    WHERE p.id = ?
    LIMIT 1
  `;

  conn.query(sql, [id], (err, rows) => {
    if (err) return callback(err);
    if (rows.length === 0) return callback(null, null);

    const product = Product.fromRow(rows[0]);
    callback(null, product);
  });
};

// Crear producto
exports.create = (conn, data, callback) => {
  const {
    category_id,
    producer_id,
    name,
    slug,
    sku,
    description,
    price,
    status,
    weight_grams,
  } = data;

  // Si no viene slug, lo generamos desde el nombre
  const finalSlug =
    (slug && slug.trim()) || slugify(name || '');

  if (!finalSlug) {
    return callback(new Error('El slug no puede ser vacío.'), null);
  }

  const sql = `
    INSERT INTO products
      (category_id, producer_id, name, slug, sku, description, price, status, weight_grams)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    category_id || null,
    producer_id || null,
    name,
    finalSlug,
    sku || null,
    description || null,
    price,
    status || 'active',
    weight_grams || null,
  ];

  conn.query(sql, params, (err, result) => {
    if (err) return callback(err);
    callback(null, result.insertId);
  });
};

// Actualizar producto
exports.update = (conn, id, data, callback) => {
  const {
    category_id,
    producer_id,
    name,
    slug,
    sku,
    description,
    price,
    status,
    weight_grams,
  } = data;

  // Igual que en create: si slug no viene, lo regeneramos desde name
  const finalSlug =
    (slug && slug.trim()) || slugify(name || '');

  if (!finalSlug) {
    return callback(new Error('El slug no puede ser vacío.'), 0);
  }

  const sql = `
    UPDATE products
    SET
      category_id   = ?,
      producer_id   = ?,
      name          = ?,
      slug          = ?,
      sku           = ?,
      description   = ?,
      price         = ?,
      status        = ?,
      weight_grams  = ?
    WHERE id = ?
  `;

  const params = [
    category_id || null,
    producer_id || null,
    name,
    finalSlug,
    sku || null,
    description || null,
    price,
    status || 'active',
    weight_grams || null,
    id,
  ];

  conn.query(sql, params, (err, result) => {
    if (err) return callback(err);
    callback(null, result.affectedRows);
  });
};

// Eliminar producto
exports.remove = (conn, id, callback) => {
  const sql = 'DELETE FROM products WHERE id = ?';

  conn.query(sql, [id], (err, result) => {
    if (err) return callback(err);
    callback(null, result.affectedRows);
  });
};

// Para el panel de productos (categorías y productores activos)
exports.getMeta = (conn, callback) => {
  const sqlCategories = `
    SELECT id, name
    FROM categories
    ORDER BY name ASC
  `;

  const sqlProducers = `
    SELECT id, name
    FROM producers
    WHERE active = 1
    ORDER BY name ASC
  `;

  conn.query(sqlCategories, (err, catRows) => {
    if (err) return callback(err);

    conn.query(sqlProducers, (err2, prodRows) => {
      if (err2) return callback(err2);

      callback(null, {
        categories: catRows,
        producers: prodRows,
      });
    });
  });
};

// services/productService.js
const Product = require('../models/product');

// Util para generar slug a partir del nombre
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 180);
}

exports.getAll = (conn, cb) => {
  const sql = `
    SELECT
      p.*,
      c.name  AS category_name,
      pr.name AS producer_name,
      img.url AS primary_image_url,
      s.quantity AS stock_quantity
    FROM products p
    LEFT JOIN categories c   ON p.category_id = c.id
    LEFT JOIN producers pr   ON p.producer_id = pr.id
    LEFT JOIN product_images img
      ON img.product_id = p.id AND img.is_primary = 1
    LEFT JOIN stock s        ON s.product_id = p.id
    ORDER BY p.id ASC
  `;

  conn.query(sql, (err, rows) => {
    if (err) return cb(err);
    const products = rows.map(Product.fromRow);
    cb(null, products);
  });
};

exports.getMeta = (conn, cb) => {
  const meta = { categories: [], producers: [] };

  conn.query(
    'SELECT id, name FROM categories ORDER BY name ASC',
    (err, catRows) => {
      if (err) return cb(err);

      meta.categories = catRows;

      conn.query(
        'SELECT id, name FROM producers WHERE active = 1 ORDER BY name ASC',
        (err2, prodRows) => {
          if (err2) return cb(err2);

          meta.producers = prodRows;
          cb(null, meta);
        }
      );
    }
  );
};

exports.getById = (conn, id, cb) => {
  const sql = `
    SELECT
      p.*,
      c.name  AS category_name,
      pr.name AS producer_name,
      img.url AS primary_image_url,
      s.quantity AS stock_quantity
    FROM products p
    LEFT JOIN categories c   ON p.category_id = c.id
    LEFT JOIN producers pr   ON p.producer_id = pr.id
    LEFT JOIN product_images img
      ON img.product_id = p.id AND img.is_primary = 1
    LEFT JOIN stock s        ON s.product_id = p.id
    WHERE p.id = ?
    LIMIT 1
  `;

  conn.query(sql, [id], (err, rows) => {
    if (err) return cb(err);
    if (!rows.length) return cb(null, null);
    const product = Product.fromRow(rows[0]);
    cb(null, product);
  });
};

exports.create = (conn, data, cb) => {
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
  } = data;

  const slug = slugify(name);
  const finalStatus = ['active', 'inactive', 'draft'].includes(status)
    ? status
    : 'active';

  const sql = `
    INSERT INTO products
      (category_id, producer_id, name, slug, sku, description, price, status, weight_grams)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  conn.query(
    sql,
    [
      category_id,
      producer_id,
      name,
      slug,
      sku,
      description,
      price,
      finalStatus,
      weight_grams,
    ],
    (err, result) => {
      if (err) return cb(err);

      const productId = result.insertId;

      // Si viene stock_quantity, lo insertamos/actualizamos
      if (stock_quantity !== null && stock_quantity !== undefined) {
        const stockSql = `
          INSERT INTO stock (product_id, quantity)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)
        `;
        conn.query(
          stockSql,
          [productId, stock_quantity],
          (err2) => {
            if (err2) return cb(err2);
            cb(null, productId);
          }
        );
      } else {
        cb(null, productId);
      }
    }
  );
};

exports.update = (conn, id, data, cb) => {
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
  } = data;

  const slug = slugify(name);
  const finalStatus = ['active', 'inactive', 'draft'].includes(status)
    ? status
    : 'active';

  const sql = `
    UPDATE products
    SET
      category_id  = ?,
      producer_id  = ?,
      name         = ?,
      slug         = ?,
      sku          = ?,
      description  = ?,
      price        = ?,
      status       = ?,
      weight_grams = ?
    WHERE id = ?
  `;

  conn.query(
    sql,
    [
      category_id,
      producer_id,
      name,
      slug,
      sku,
      description,
      price,
      finalStatus,
      weight_grams,
      id,
    ],
    (err, result) => {
      if (err) return cb(err);

      if (result.affectedRows === 0) return cb(null, 0);

      if (stock_quantity !== null && stock_quantity !== undefined) {
        const stockSql = `
          INSERT INTO stock (product_id, quantity)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)
        `;
        conn.query(
          stockSql,
          [id, stock_quantity],
          (err2) => {
            if (err2) return cb(err2);
            cb(null, result.affectedRows);
          }
        );
      } else {
        cb(null, result.affectedRows);
      }
    }
  );
};

exports.remove = (conn, id, cb) => {
  const sql = 'DELETE FROM products WHERE id = ?';

  conn.query(sql, [id], (err, result) => {
    if (err) return cb(err);
    cb(null, result.affectedRows);
  });
};

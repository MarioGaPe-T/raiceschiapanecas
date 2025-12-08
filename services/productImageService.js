// services/productImageService.js

exports.getByProduct = (conn, productId, cb) => {
  const sql = `
    SELECT id, product_id, url, alt, is_primary, created_at
    FROM product_images
    WHERE product_id = ?
    ORDER BY is_primary DESC, id ASC
  `;
  conn.query(sql, [productId], (err, rows) => {
    if (err) return cb(err);
    cb(null, rows);
  });
};

exports.createMany = (conn, productId, images, cb) => {
  if (!images || !images.length) return cb(null);

  // Si alguna viene como primaria, primero bajamos todas a 0
  const hasPrimary = images.some((img) => img.is_primary);

  const insertImages = () => {
    const values = images.map((img) => [
      productId,
      img.url,
      img.alt || null,
      img.is_primary ? 1 : 0,
    ]);

    const sql = `
      INSERT INTO product_images (product_id, url, alt, is_primary)
      VALUES ?
    `;

    conn.query(sql, [values], (err) => {
      if (err) return cb(err);
      cb(null);
    });
  };

  if (hasPrimary) {
    conn.query(
      'UPDATE product_images SET is_primary = 0 WHERE product_id = ?',
      [productId],
      (err) => {
        if (err) return cb(err);
        insertImages();
      }
    );
  } else {
    insertImages();
  }
};

exports.remove = (conn, imageId, cb) => {
  const sql = 'DELETE FROM product_images WHERE id = ?';
  conn.query(sql, [imageId], (err, result) => {
    if (err) return cb(err);
    cb(null, result.affectedRows);
  });
};

exports.setPrimary = (conn, imageId, cb) => {
  // Primero necesitamos saber a qué producto pertenece esa imagen
  const findSql = 'SELECT product_id FROM product_images WHERE id = ? LIMIT 1';
  conn.query(findSql, [imageId], (err, rows) => {
    if (err) return cb(err);
    if (!rows.length) return cb(null); // nada que hacer

    const productId = rows[0].product_id;

    conn.query(
      'UPDATE product_images SET is_primary = 0 WHERE product_id = ?',
      [productId],
      (err2) => {
        if (err2) return cb(err2);

        conn.query(
          'UPDATE product_images SET is_primary = 1 WHERE id = ?',
          [imageId],
          (err3) => {
            if (err3) return cb(err3);
            cb(null);
          }
        );
      }
    );
  });
};

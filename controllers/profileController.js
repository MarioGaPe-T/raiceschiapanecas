// controllers/profileController.js
const bcrypt = require('bcryptjs');

// GET /profile/data
exports.getProfileData = (req, res) => {
  const userId = req.session.user.id;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    const sqlUser = `
      SELECT id, full_name, email, phone, created_at
      FROM customers
      WHERE id = ?
      LIMIT 1
    `;

    conn.query(sqlUser, [userId], (err, rows) => {
      if (err) {
        console.error('Error al obtener perfil:', err);
        return res.status(500).json({ error: 'Error al obtener perfil' });
      }

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const customer = rows[0];

      const sqlAddr = `
        SELECT id, street, city, state, postal_code, country, is_default
        FROM addresses
        WHERE customer_id = ? AND type = 'shipping' AND is_default = 1
        LIMIT 1
      `;

      conn.query(sqlAddr, [userId], (err, addrRows) => {
        if (err) {
          console.error('Error al obtener dirección:', err);
          return res.status(500).json({ error: 'Error al obtener dirección' });
        }

        const shippingAddress = addrRows.length > 0 ? addrRows[0] : null;

        res.json({ customer, shippingAddress });
      });
    });
  });
};

// PUT /profile/data
exports.updateProfile = (req, res) => {
  const userId = req.session.user.id;
  const { full_name, email, phone } = req.body;

  if (!full_name || !email) {
    return res
      .status(400)
      .json({ error: 'full_name y email son obligatorios' });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    // ¿Ese email ya lo usa otro cliente?
    const sqlCheck = `
      SELECT id FROM customers
      WHERE email = ? AND id <> ?
      LIMIT 1
    `;

    conn.query(sqlCheck, [email, userId], (err, rows) => {
      if (err) {
        console.error('Error al comprobar email:', err);
        return res.status(500).json({ error: 'Error al comprobar email' });
      }

      if (rows.length > 0) {
        return res.status(400).json({ error: 'Ese correo ya está en uso por otro usuario' });
      }

      const sqlUpdate = `
        UPDATE customers
        SET full_name = ?, email = ?, phone = ?
        WHERE id = ?
      `;

      conn.query(
        sqlUpdate,
        [full_name, email, phone || null, userId],
        (err, result) => {
          if (err) {
            console.error('Error al actualizar perfil:', err);
            return res.status(500).json({ error: 'Error al actualizar perfil' });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
          }

          // Actualizamos la sesión
          req.session.user.full_name = full_name;
          req.session.user.email = email;

          res.json({ message: 'Perfil actualizado correctamente' });
        }
      );
    });
  });
};

// PUT /profile/password
exports.changePassword = (req, res) => {
  const userId = req.session.user.id;
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res
      .status(400)
      .json({ error: 'current_password y new_password son obligatorios' });
  }

  if (new_password.length < 6) {
    return res
      .status(400)
      .json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    const sqlGet = `
      SELECT password_hash
      FROM customers
      WHERE id = ?
      LIMIT 1
    `;

    conn.query(sqlGet, [userId], async (err, rows) => {
      if (err) {
        console.error('Error al obtener contraseña actual:', err);
        return res.status(500).json({ error: 'Error al obtener contraseña' });
      }

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const currentHash = rows[0].password_hash || '';

      const isMatch = await bcrypt.compare(current_password, currentHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'La contraseña actual no es correcta' });
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(new_password, salt);

      const sqlUpdate = `
        UPDATE customers
        SET password_hash = ?
        WHERE id = ?
      `;

      conn.query(sqlUpdate, [newHash, userId], (err) => {
        if (err) {
          console.error('Error al actualizar contraseña:', err);
          return res.status(500).json({ error: 'Error al actualizar contraseña' });
        }

        res.json({ message: 'Contraseña actualizada correctamente' });
      });
    });
  });
};

// PUT /profile/address
exports.upsertShippingAddress = (req, res) => {
  const userId = req.session.user.id;
  const { street, city, state, postal_code, country } = req.body;

  if (!street || !city || !state || !postal_code) {
    return res.status(400).json({
      error: 'street, city, state y postal_code son obligatorios',
    });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    const sqlCheck = `
      SELECT id
      FROM addresses
      WHERE customer_id = ? AND type = 'shipping' AND is_default = 1
      LIMIT 1
    `;

    conn.query(sqlCheck, [userId], (err, rows) => {
      if (err) {
        console.error('Error al comprobar dirección:', err);
        return res.status(500).json({ error: 'Error al comprobar dirección' });
      }

      const countryValue = country || 'México';

      if (rows.length === 0) {
        // Insertar nueva
        const sqlInsert = `
          INSERT INTO addresses
            (customer_id, type, street, city, state, postal_code, country, is_default)
          VALUES (?, 'shipping', ?, ?, ?, ?, ?, 1)
        `;

        conn.query(
          sqlInsert,
          [userId, street, city, state, postal_code, countryValue],
          (err, result) => {
            if (err) {
              console.error('Error al crear dirección:', err);
              return res.status(500).json({ error: 'Error al guardar dirección' });
            }

            res.json({
              message: 'Dirección de envío creada correctamente',
              id: result.insertId,
            });
          }
        );
      } else {
        // Actualizar existente
        const addrId = rows[0].id;
        const sqlUpdate = `
          UPDATE addresses
          SET street = ?, city = ?, state = ?, postal_code = ?, country = ?
          WHERE id = ?
        `;

        conn.query(
          sqlUpdate,
          [street, city, state, postal_code, countryValue, addrId],
          (err) => {
            if (err) {
              console.error('Error al actualizar dirección:', err);
              return res.status(500).json({ error: 'Error al actualizar dirección' });
            }

            res.json({ message: 'Dirección de envío actualizada correctamente' });
          }
        );
      }
    });
  });
};

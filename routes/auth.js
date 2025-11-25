const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');

const router = express.Router();

router.get('/register', (req, res) => {
  const filePath = path.join(__dirname, '../views/register.html');
  res.sendFile(filePath);
});

router.post('/register', (req, res) => {
  const { full_name, email, phone, password } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({
      error: 'full_name, email y password son obligatorios',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'La contraseña debe tener al menos 6 caracteres',
    });
  }

  req.getConnection(async (err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    try {
      const checkSql = 'SELECT id FROM customers WHERE email = ? LIMIT 1';
      conn.query(checkSql, [email], async (err, rows) => {
        if (err) {
          console.error('Error al comprobar email:', err);
          return res.status(500).json({ error: 'Error al comprobar el correo' });
        }

        if (rows.length > 0) {
          return res.status(400).json({ error: 'Ya existe un usuario con ese correo' });
        }

        // Hashear contraseña
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const insertSql = `
          INSERT INTO customers (full_name, email, phone, password_hash)
          VALUES (?, ?, ?, ?)
        `;

        conn.query(
          insertSql,
          [full_name, email, phone || null, password_hash],
          (err, result) => {
            if (err) {
              console.error('Error al registrar usuario:', err);
              return res.status(500).json({ error: 'Error al registrar usuario' });
            }

            res.json({
              message: 'Usuario registrado correctamente',
              id: result.insertId,
            });
          }
        );
      });
    } catch (e) {
      console.error('Error al procesar registro:', e);
      res.status(500).json({ error: 'Error interno al registrar usuario' });
    }
  });
});


router.get('/login', (req, res) => {
  const filePath = path.join(__dirname, '../views/login.html');
  res.sendFile(filePath);
});


router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'email y password son obligatorios',
    });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a la BD:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = `
      SELECT id, full_name, email, phone, password_hash, role
      FROM customers
      WHERE email = ?
      LIMIT 1
    `;

    conn.query(sql, [email], async (err, rows) => {
      if (err) {
        console.error('Error en consulta de login:', err);
        return res.status(500).json({ error: 'Error al buscar usuario' });
      }

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const user = rows[0];

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        req.session.user = {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        };

        res.json({
        message: 'Login correcto',
        user: req.session.user,
        });
    });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).json({ error: 'No se pudo cerrar sesión' });
    }
    res.json({ message: 'Sesión cerrada correctamente' });
  });
});

module.exports = router;

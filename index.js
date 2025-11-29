// index.js
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const myConnection = require('express-myconnection');
const bcrypt = require('bcryptjs');

// Config DB (mysql2 + datos de conexión)
const { mysql, dbConfig } = require('./config/db');

// Rutas de administración / autenticación
const authRouter = require('./routes/auth');
const customersRouter = require('./routes/customers');
const producersRouter = require('./routes/producers');
const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');

const app = express();

/* ===========================
   Middlewares globales
   =========================== */

// Logs HTTP
app.use(morgan('dev'));

// Parseo de body (formularios y JSON)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (CSS, JS del frontend, imágenes)
app.use(express.static(path.join(__dirname, 'public')));

// Sesiones (para login)
app.use(
  session({
    secret: 'raices-super-secreto-123',
    resave: false,
    saveUninitialized: false,
  })
);

// Conexión a MySQL usando express-myconnection
app.use(myConnection(mysql, dbConfig, 'pool'));

/* ===========================
   Info del usuario logueado (/me)
   =========================== */

app.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.json({
      loggedIn: false,
      user: null,
    });
  }

  return res.json({
    loggedIn: true,
    user: req.session.user, // { id, full_name, email, role }
  });
});

/* ===========================
   Middleware de autorización
   =========================== */

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    // No está logueado
    return res.redirect('/login');
  }

  if (req.session.user.role !== 'admin') {
    // Logueado pero no admin
    return res.status(403).send('Acceso solo para administradores');
  }

  next();
}

/* ===========================
   API pública para la tienda
   (solo lectura, sin requireAdmin)
   =========================== */

// GET /api/categories  -> lista de categorías para la tienda
app.get('/api/categories', (req, res) => {
  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en /api/categories:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = `
      SELECT id, name, slug
      FROM categories
      ORDER BY name ASC
    `;

    conn.query(sql, (err, rows) => {
      if (err) {
        console.error('Error al obtener categorías (API tienda):', err);
        return res
          .status(500)
          .json({ error: 'Error al obtener categorías' });
      }

      res.json(rows);
    });
  });
});

// GET /api/products   -> lista de productos con categoría y productor (para tienda)
// Soporta ?categoryId= y ?q= (búsqueda por nombre)
app.get('/api/products', (req, res) => {
  const { categoryId, q } = req.query;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en /api/products:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    let sql = `
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
      WHERE p.status = 'active'
    `;
    const params = [];

    // Filtro por categoría si viene categoryId
    if (categoryId) {
      sql += ' AND p.category_id = ?';
      params.push(categoryId);
    }

    // Búsqueda por nombre si viene q
    if (q) {
      sql += ' AND p.name LIKE ?';
      params.push(`%${q}%`);
    }

    sql += ' ORDER BY p.id ASC';

    conn.query(sql, params, (err, rows) => {
      if (err) {
        console.error('Error al obtener productos (API tienda):', err);
        return res
          .status(500)
          .json({ error: 'Error al obtener productos' });
      }

      res.json(rows);
    });
  });
});

/* ===========================
   API de perfil (datos del cliente)
   =========================== */

// GET /api/profile -> info del cliente logueado
app.get('/api/profile', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  const userId = req.session.user.id;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en /api/profile:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = `
      SELECT id, full_name, email, phone, role, created_at
      FROM customers
      WHERE id = ?
      LIMIT 1
    `;

    conn.query(sql, [userId], (err, rows) => {
      if (err) {
        console.error('Error al obtener perfil:', err);
        return res
          .status(500)
          .json({ error: 'Error al obtener información del perfil' });
      }

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json(rows[0]);
    });
  });
});

// PUT /api/profile -> actualizar nombre / correo / teléfono
app.put('/api/profile', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  const userId = req.session.user.id;
  const { full_name, email, phone } = req.body;

  if (!full_name || !email) {
    return res
      .status(400)
      .json({ error: 'full_name y email son obligatorios' });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en PUT /api/profile:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = `
      UPDATE customers
      SET full_name = ?, email = ?, phone = ?
      WHERE id = ?
    `;

    conn.query(sql, [full_name, email, phone || null, userId], (err, result) => {
      if (err) {
        console.error('Error al actualizar perfil:', err);
        return res
          .status(500)
          .json({ error: 'Error al actualizar perfil' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Actualizamos la sesión para reflejar cambios
      req.session.user.full_name = full_name;
      req.session.user.email = email;

      res.json({ message: 'Perfil actualizado correctamente' });
    });
  });
});

// PUT /api/profile/password -> cambiar contraseña
app.put('/api/profile/password', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  const userId = req.session.user.id;
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({
      error: 'current_password y new_password son obligatorios',
    });
  }

  if (new_password.length < 6) {
    return res
      .status(400)
      .json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  req.getConnection(async (err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en PUT /api/profile/password:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    const sqlSelect = `
      SELECT password_hash
      FROM customers
      WHERE id = ?
      LIMIT 1
    `;

    conn.query(sqlSelect, [userId], async (err, rows) => {
      if (err) {
        console.error('Error al obtener contraseña actual:', err);
        return res
          .status(500)
          .json({ error: 'Error al verificar contraseña actual' });
      }

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const { password_hash } = rows[0];

      const isMatch = await bcrypt.compare(current_password, password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
      }

      // Generar nuevo hash
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(new_password, salt);

      const sqlUpdate = `
        UPDATE customers
        SET password_hash = ?
        WHERE id = ?
      `;

      conn.query(sqlUpdate, [newHash, userId], (err, result) => {
        if (err) {
          console.error('Error al actualizar contraseña:', err);
          return res
            .status(500)
            .json({ error: 'Error al actualizar contraseña' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: 'Contraseña actualizada correctamente' });
      });
    });
  });
});

/* ===========================
   API de direcciones de perfil
   =========================== */

// GET /api/profile/address  -> obtener dirección principal del cliente
app.get('/api/profile/address', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  const userId = req.session.user.id;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en /api/profile/address:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = `
      SELECT
        id,
        type,
        street,
        city,
        state,
        postal_code,
        country,
        is_default,
        created_at
      FROM addresses
      WHERE customer_id = ?
      ORDER BY is_default DESC, id ASC
    `;

    conn.query(sql, [userId], (err, rows) => {
      if (err) {
        console.error('Error al obtener dirección:', err);
        return res
          .status(500)
          .json({ error: 'Error al obtener dirección de envío' });
      }

      if (rows.length === 0) {
        // No hay dirección aún
        return res.json(null);
      }

      // Por simplicidad, regresamos la primera (la default o la más antigua)
      res.json(rows[0]);
    });
  });
});

// Handler reutilizable para crear / actualizar dirección
function handleSaveAddress(req, res) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  const userId = req.session.user.id;
  const {
    id,
    type,        // 'shipping' o 'billing'
    street,
    city,
    state,
    postal_code,
    country,
  } = req.body;

  if (!street || !city || !state || !postal_code) {
    return res
      .status(400)
      .json({ error: 'street, city, state y postal_code son obligatorios' });
  }

  const addrType = type === 'billing' ? 'billing' : 'shipping';
  const countryVal = country || 'México';

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en SAVE /api/profile/address:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    // Si viene id => update
    if (id) {
      const sql = `
        UPDATE addresses
        SET type = ?, street = ?, city = ?, state = ?, postal_code = ?, country = ?, is_default = 1
        WHERE id = ? AND customer_id = ?
      `;
      conn.query(
        sql,
        [addrType, street, city, state, postal_code, countryVal, id, userId],
        (err, result) => {
          if (err) {
            console.error('Error al actualizar dirección:', err);
            return res
              .status(500)
              .json({ error: 'Error al actualizar dirección' });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Dirección no encontrada' });
          }

          res.json({ message: 'Dirección actualizada correctamente' });
        }
      );
    } else {
      // Insertar nueva dirección
      const sql = `
        INSERT INTO addresses
          (customer_id, type, street, city, state, postal_code, country, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `;
      conn.query(
        sql,
        [userId, addrType, street, city, state, postal_code, countryVal],
        (err, result) => {
          if (err) {
            console.error('Error al crear dirección:', err);
            return res
              .status(500)
              .json({ error: 'Error al crear dirección' });
          }

          res.status(201).json({
            message: 'Dirección creada correctamente',
            id: result.insertId,
          });
        }
      );
    }
  });
}

// POST /api/profile/address -> crear / actualizar dirección principal
app.post('/api/profile/address', handleSaveAddress);

// PUT /api/profile/address -> actualizar dirección principal (misma lógica)
app.put('/api/profile/address', handleSaveAddress);

/* ===========================
   Rutas principales (auth + admin)
   =========================== */

// Rutas públicas: register, login, logout, etc.
app.use('/', authRouter);

// Rutas de administración (CRUD de catálogos)
// Solo accesibles si el usuario está logueado como admin
app.use('/customers', requireAdmin, customersRouter);
app.use('/producers', requireAdmin, producersRouter);
app.use('/products', requireAdmin, productsRouter);
app.use('/categories', requireAdmin, categoriesRouter);

// Página principal del panel admin
app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Página de perfil de usuario (cliente/admin)
app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

// Ruta raíz: tienda pública
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'shop.html'));
});

/* ===========================
   Arranque del servidor
   =========================== */

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

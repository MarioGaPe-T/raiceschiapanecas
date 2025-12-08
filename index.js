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

// Estados de envío permitidos (ajusta según tu tabla `shipments`)
const ALLOWED_SHIPMENT_STATUSES = [
  'pending',
  'shipped',
  'out_for_delivery',
  'delivered',
  'returned',
  'lost',
];


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

// GET /api/my-orders -> lista de pedidos del cliente logueado
app.get('/api/my-orders', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  const customerId = req.session.user.id;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en /api/my-orders:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = `
      SELECT
        o.id,
        o.status,
        o.grand_total,
        o.created_at,
        COUNT(oi.id) AS items_count,
        s.status AS shipment_status
      FROM orders o
      LEFT JOIN order_items oi
        ON oi.order_id = o.id
      LEFT JOIN shipments s
        ON s.order_id = o.id
      WHERE o.customer_id = ?
      GROUP BY
        o.id,
        o.status,
        o.grand_total,
        o.created_at,
        s.status
      ORDER BY o.created_at DESC
    `;

    conn.query(sql, [customerId], (err, rows) => {
      if (err) {
        console.error('Error al obtener pedidos del cliente:', err);
        return res
          .status(500)
          .json({ error: 'Error al obtener pedidos' });
      }

      res.json(rows);
    });
  });
});


// GET /api/products   -> lista de productos con categoría, productor e imagen principal (para tienda)
app.get('/api/products', (req, res) => {
  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en /api/products:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

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
        c.slug  AS category_slug,
        pr.name AS producer_name,
        img.url AS image_url
      FROM products p
      LEFT JOIN categories c
        ON p.category_id = c.id
      LEFT JOIN producers pr
        ON p.producer_id = pr.id
      LEFT JOIN product_images img
        ON img.product_id = p.id
       AND img.is_primary = 1
      WHERE p.status = 'active'
      ORDER BY p.id ASC
    `;

    conn.query(sql, (err, rows) => {
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

    conn.query(sql, (err2, rows) => {
      if (err2) {
        console.error('Error al obtener categorías (API tienda):', err2);
        return res
          .status(500)
          .json({ error: 'Error al obtener categorías' });
      }

      res.json(rows);
    });
  });
});


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
   Helpers de carrito
   =========================== */

function findOrCreateOpenCart(conn, customerId, cb) {
  const sqlFind = `
    SELECT id
    FROM carts
    WHERE customer_id = ?
      AND status = 'open'
    ORDER BY id DESC
    LIMIT 1
  `;

  conn.query(sqlFind, [customerId], (err, rows) => {
    if (err) return cb(err);

    if (rows.length > 0) {
      return cb(null, rows[0].id);
    }

    const sqlInsert = `
      INSERT INTO carts (customer_id, status, created_at)
      VALUES (?, 'open', NOW())
    `;

    conn.query(sqlInsert, [customerId], (err2, result) => {
      if (err2) return cb(err2);
      cb(null, result.insertId);
    });
  });
}

function getCartSummary(conn, cartId, cb) {
  const sqlItems = `
    SELECT
      ci.id,
      ci.product_id,
      ci.quantity,
      ci.unit_price,
      (ci.quantity * ci.unit_price) AS line_total,
      p.name AS product_name,
      p.slug AS product_slug,
      p.sku,
      img.url AS image_url
    FROM cart_items ci
    JOIN products p
      ON p.id = ci.product_id
    LEFT JOIN product_images img
      ON img.product_id = p.id
     AND img.is_primary = 1
    WHERE ci.cart_id = ?
  `;

  conn.query(sqlItems, [cartId], (err, rows) => {
    if (err) return cb(err);

    let subtotal = 0;
    let itemsCount = 0;

    rows.forEach((r) => {
      const line = Number(r.line_total || 0);
      subtotal += line;
      itemsCount += r.quantity || 0;
    });

    const summary = {
      cart_id: cartId,
      items_count: itemsCount,
      subtotal,
      shipping_cost: 0,
      tax_total: 0,
      grand_total: subtotal,
      items: rows,
    };

    cb(null, summary);
  });
}

/* ===========================
   API de carrito
   =========================== */

// GET /api/cart -> resumen del carrito actual del cliente
app.get('/api/cart', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  const customerId = req.session.user.id;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en /api/cart:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    findOrCreateOpenCart(conn, customerId, (err2, cartId) => {
      if (err2) {
        console.error('Error al obtener/crear carrito:', err2);
        return res
          .status(500)
          .json({ error: 'Error al obtener el carrito' });
      }

      getCartSummary(conn, cartId, (err3, summary) => {
        if (err3) {
          console.error('Error al obtener resumen de carrito:', err3);
          return res
            .status(500)
            .json({ error: 'Error al obtener el carrito' });
        }

        return res.json(summary);
      });
    });
  });
});

// Handler reutilizable para agregar al carrito (lo usa /api/cart/add y /api/cart/items)
function handleAddToCart(req, res) {
  if (!req.session.user) {
    return res
      .status(401)
      .json({ error: 'Debes iniciar sesión para usar el carrito' });
  }

  const customerId = req.session.user.id;
  const { product_id, quantity } = req.body;

  const productId = parseInt(product_id, 10);
  let qty = parseInt(quantity, 10);

  if (Number.isNaN(productId) || productId <= 0) {
    return res.status(400).json({ error: 'product_id inválido' });
  }

  if (Number.isNaN(qty) || qty <= 0) {
    qty = 1;
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en handleAddToCart:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    findOrCreateOpenCart(conn, customerId, (err2, cartId) => {
      if (err2) {
        console.error('Error al obtener/crear carrito:', err2);
        return res
          .status(500)
          .json({ error: 'Error al obtener el carrito' });
      }

      const sqlProd = `
        SELECT id, price, status
        FROM products
        WHERE id = ?
        LIMIT 1
      `;

      conn.query(sqlProd, [productId], (err3, rows) => {
        if (err3) {
          console.error('Error al obtener producto para carrito:', err3);
          return res
            .status(500)
            .json({ error: 'Error al verificar el producto' });
        }

        if (rows.length === 0 || rows[0].status !== 'active') {
          return res.status(400).json({ error: 'Producto no disponible' });
        }

        const unitPrice = Number(rows[0].price);

        const sqlInsert = `
          INSERT INTO cart_items (cart_id, product_id, quantity, unit_price)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            quantity = quantity + VALUES(quantity),
            unit_price = VALUES(unit_price)
        `;

        conn.query(sqlInsert, [cartId, productId, qty, unitPrice], (err4) => {
          if (err4) {
            console.error('Error al agregar al carrito:', err4);
            return res
              .status(500)
              .json({ error: 'Error al agregar al carrito' });
          }

          const sqlUpdateCart = `
            UPDATE carts
            SET updated_at = NOW()
            WHERE id = ?
          `;

          conn.query(sqlUpdateCart, [cartId], (err5) => {
            if (err5) {
              console.error(
                'Error al actualizar timestamp del carrito:',
                err5
              );
            }
            return res.json({ message: 'Producto agregado al carrito' });
          });
        });
      });
    });
  });
}

// Compatibilidad con front
app.post('/api/cart/add', handleAddToCart);     // usado por shop.html
app.post('/api/cart/items', handleAddToCart);   // por si algo todavía llama a /items

// PUT /api/cart/items/:id -> actualizar cantidad
app.put('/api/cart/items/:id', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  const customerId = req.session.user.id;
  const itemId = parseInt(req.params.id, 10);
  let { quantity } = req.body;

  let qty = parseInt(quantity, 10);
  if (Number.isNaN(qty) || qty < 1) {
    qty = 1;
  }

  if (Number.isNaN(itemId) || itemId <= 0) {
    return res.status(400).json({ error: 'ID de item inválido' });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión en PUT /api/cart/items/:id:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = `
      UPDATE cart_items ci
      JOIN carts c ON c.id = ci.cart_id
      SET ci.quantity = ?
      WHERE ci.id = ?
        AND c.customer_id = ?
        AND c.status = 'open'
    `;

    conn.query(sql, [qty, itemId, customerId], (err2, result) => {
      if (err2) {
        console.error('Error al actualizar cantidad de item:', err2);
        return res
          .status(500)
          .json({ error: 'Error al actualizar cantidad' });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: 'No se encontró el item del carrito para este usuario' });
      }

      return res.json({ message: 'Cantidad actualizada' });
    });
  });
});

// DELETE /api/cart/items/:id -> quitar producto del carrito
app.delete('/api/cart/items/:id', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  const customerId = req.session.user.id;
  const itemId = parseInt(req.params.id, 10);

  if (Number.isNaN(itemId) || itemId <= 0) {
    return res.status(400).json({ error: 'ID de item inválido' });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión en DELETE /api/cart/items/:id:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = `
      DELETE ci
      FROM cart_items ci
      JOIN carts c ON c.id = ci.cart_id
      WHERE ci.id = ?
        AND c.customer_id = ?
        AND c.status = 'open'
    `;

    conn.query(sql, [itemId, customerId], (err2, result) => {
      if (err2) {
        console.error('Error al eliminar item del carrito:', err2);
        return res
          .status(500)
          .json({ error: 'Error al eliminar producto del carrito' });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: 'No se encontró el item del carrito para este usuario' });
      }

      return res.json({ message: 'Producto eliminado del carrito' });
    });
  });
});

// POST /api/cart/checkout -> crear pedido a partir del carrito
app.post('/api/cart/checkout', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  const customerId = req.session.user.id;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en POST /api/cart/checkout:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    findOrCreateOpenCart(conn, customerId, (err2, cartId) => {
      if (err2) {
        console.error('Error al obtener/crear carrito en checkout:', err2);
        return res
          .status(500)
          .json({ error: 'Error al obtener el carrito' });
      }

      getCartSummary(conn, cartId, (err3, summary) => {
        if (err3) {
          console.error('Error al obtener resumen de carrito en checkout:', err3);
          return res
            .status(500)
            .json({ error: 'Error al obtener el carrito' });
        }

        if (!summary.items || summary.items.length === 0) {
          return res
            .status(400)
            .json({ error: 'Tu carrito está vacío, agrega productos antes de comprar.' });
        }

        // Verificar que el usuario tenga una dirección de envío
        const sqlAddr = `
          SELECT id
          FROM addresses
          WHERE customer_id = ?
          ORDER BY is_default DESC, id ASC
          LIMIT 1
        `;

        conn.query(sqlAddr, [customerId], (err4, addrRows) => {
          if (err4) {
            console.error('Error al obtener dirección para checkout:', err4);
            return res
              .status(500)
              .json({ error: 'Error al verificar dirección de envío' });
          }

          if (addrRows.length === 0) {
            return res.status(400).json({
              error:
                'Debes registrar una dirección de envío antes de completar tu compra. Ve a "Mi perfil".',
            });
          }

          const shippingAddrId = addrRows[0].id;
          const billingAddrId = shippingAddrId;

          const subtotal = summary.subtotal;
          const shippingCost = 0;
          const taxTotal = 0;
          const grandTotal = subtotal + shippingCost + taxTotal;

          const sqlOrderInsert = `
            INSERT INTO orders
              (customer_id, shipping_addr_id, billing_addr_id, status,
               subtotal, shipping_cost, tax_total, grand_total, created_at)
            VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, NOW())
          `;

          conn.query(
            sqlOrderInsert,
            [
              customerId,
              shippingAddrId,
              billingAddrId,
              subtotal,
              shippingCost,
              taxTotal,
              grandTotal,
            ],
            (err5, orderResult) => {
              if (err5) {
                console.error('Error al crear pedido en checkout:', err5);
                return res
                  .status(500)
                  .json({ error: 'Error al crear el pedido' });
              }

              const orderId = orderResult.insertId;

              const items = summary.items;
              if (!items || items.length === 0) {
                return res
                  .status(500)
                  .json({ error: 'El pedido no tiene productos válidos' });
              }

              const placeholders = items
                .map(() => '(?, ?, ?, ?)')
                .join(', ');

              const params = [];
              items.forEach((item) => {
                params.push(
                  orderId,
                  item.product_id,
                  item.quantity,
                  item.unit_price
                );
              });

              const sqlItemsInsert = `
                INSERT INTO order_items (order_id, product_id, quantity, unit_price)
                VALUES ${placeholders}
              `;

              conn.query(sqlItemsInsert, params, (err6) => {
                if (err6) {
                  console.error(
                    'Error al insertar ítems del pedido:',
                    err6
                  );
                  return res.status(500).json({
                    error: 'Error al crear los productos del pedido',
                  });
                }

                const sqlPayment = `
                  INSERT INTO payments
                    (order_id, method, amount, status, created_at)
                  VALUES (?, 'other', ?, 'pending', NOW())
                `;

                conn.query(
                  sqlPayment,
                  [orderId, grandTotal],
                  (err7) => {
                    if (err7) {
                      console.error(
                        'Error al crear registro de pago (no bloqueante):',
                        err7
                      );
                      // No detenemos el flujo por esto.
                    }

                    const sqlUpdateCart = `
                      UPDATE carts
                      SET status = 'converted', updated_at = NOW()
                      WHERE id = ?
                    `;

                    conn.query(sqlUpdateCart, [cartId], (err8) => {
                      if (err8) {
                        console.error(
                          'Error al marcar carrito como convertido:',
                          err8
                        );
                      }

                      const sqlClearItems = `
                        DELETE FROM cart_items
                        WHERE cart_id = ?
                      `;

                      conn.query(sqlClearItems, [cartId], (err9) => {
                        if (err9) {
                          console.error(
                            'Error al limpiar items del carrito:',
                            err9
                          );
                        }

                        return res.json({
                          message: 'Pedido creado correctamente',
                          order_id: orderId,
                          grand_total: grandTotal,
                        });
                      });
                    });
                  }
                );
              });
            }
          );
        });
      });
    });
  });
});

/* ===========================
   API "Mis pedidos" del cliente
   =========================== */

// GET /api/my-orders -> lista de pedidos del cliente logueado
app.get('/api/my-orders', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  const customerId = req.session.user.id;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en /api/my-orders:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = `
      SELECT
        o.id,
        o.status,
        o.grand_total,
        o.created_at,
        COUNT(oi.id) AS items_count
      FROM orders o
      LEFT JOIN order_items oi
        ON oi.order_id = o.id
      WHERE o.customer_id = ?
      GROUP BY o.id, o.status, o.grand_total, o.created_at
      ORDER BY o.created_at DESC
    `;

    conn.query(sql, [customerId], (err, rows) => {
      if (err) {
        console.error('Error al obtener pedidos del cliente:', err);
        return res
          .status(500)
          .json({ error: 'Error al obtener pedidos' });
      }

      res.json(rows);
    });
  });
});

// GET /api/my-orders/:id -> detalle de un pedido (cabecera + líneas + envío)
app.get('/api/my-orders/:id', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  const customerId = req.session.user.id;
  const orderId = req.params.id;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en /api/my-orders/:id:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    const sqlOrder = `
      SELECT
        id,
        customer_id,
        shipping_addr_id,
        billing_addr_id,
        status,
        subtotal,
        shipping_cost,
        tax_total,
        grand_total,
        created_at
      FROM orders
      WHERE id = ? AND customer_id = ?
      LIMIT 1
    `;

    conn.query(sqlOrder, [orderId, customerId], (err1, rows) => {
      if (err1) {
        console.error('Error al obtener cabecera de pedido:', err1);
        return res
          .status(500)
          .json({ error: 'Error al obtener pedido' });
      }

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      const order = rows[0];

      const sqlItems = `
        SELECT
          oi.id,
          oi.product_id,
          p.name AS product_name,
          oi.quantity,
          oi.unit_price,
          oi.total
        FROM order_items oi
        JOIN products p
          ON p.id = oi.product_id
        WHERE oi.order_id = ?
      `;

      conn.query(sqlItems, [orderId], (err2, items) => {
        if (err2) {
          console.error('Error al obtener ítems de pedido:', err2);
          return res
            .status(500)
            .json({ error: 'Error al obtener productos del pedido' });
        }

        // === Envío (shipments) ===
        const sqlShipment = `
          SELECT
            id,
            status,
            tracking_code,
            carrier,
            created_at,
            updated_at
          FROM shipments
          WHERE order_id = ?
          LIMIT 1
        `;

        conn.query(sqlShipment, [orderId], (err3, shipRows) => {
          if (err3) {
            // SI FALLA EL ENVÍO, NO REVENTAMOS EL DETALLE, SOLO LOG Y shipment = null
            console.error('Error al obtener envío del pedido:', err3);
            return res.json({
              order,
              items,
              shipment: null,
            });
          }

          const shipment = shipRows.length ? shipRows[0] : null;

          return res.json({
            order,
            items,
            shipment,
          });
        });
      });
    });
  });
});


// POST /api/my-orders/:id/cancel -> cancelar un pedido (si está pendiente/pagado)
app.post('/api/my-orders/:id/cancel', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  const customerId = req.session.user.id;
  const orderId = req.params.id;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en /api/my-orders/:id/cancel:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = `
      UPDATE orders
      SET status = 'cancelled'
      WHERE id = ?
        AND customer_id = ?
        AND status IN ('pending','paid')
    `;

    conn.query(sql, [orderId, customerId], (err2, result) => {
      if (err2) {
        console.error('Error al cancelar pedido:', err2);
        return res
          .status(500)
          .json({ error: 'Error al cancelar el pedido' });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({
          error:
            'No se pudo cancelar el pedido. Verifica que exista, te pertenezca y que no esté ya enviado o entregado.',
        });
      }

      res.json({ message: 'Pedido cancelado correctamente' });
    });
  });
});

// POST /api/payments/:orderId/simulate -> marcar pago como "pagado" de forma ficticia
app.post('/api/payments/:orderId/simulate', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  const orderId = parseInt(req.params.orderId, 10);
  if (Number.isNaN(orderId) || orderId <= 0) {
    return res.status(400).json({ error: 'ID de pedido inválido' });
  }

  const currentUser = req.session.user;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión en POST /api/payments/:orderId/simulate:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    // 1) Verificar que el pedido exista y que el usuario sea dueño o admin
    const sqlCheck = `
      SELECT
        o.id AS order_id,
        o.customer_id,
        o.status AS order_status,
        p.id AS payment_id,
        p.status AS payment_status
      FROM orders o
      LEFT JOIN payments p
        ON p.order_id = o.id
      WHERE o.id = ?
      LIMIT 1
    `;

    conn.query(sqlCheck, [orderId], (err2, rows) => {
      if (err2) {
        console.error('Error al verificar pedido/pago:', err2);
        return res
          .status(500)
          .json({ error: 'Error al verificar pedido/pago' });
      }

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      const row = rows[0];

      // Solo el dueño del pedido o un admin pueden simular el pago
      if (
        row.customer_id !== currentUser.id &&
        currentUser.role !== 'admin'
      ) {
        return res.status(403).json({
          error: 'No tienes permiso para pagar este pedido',
        });
      }

      if (!row.payment_id) {
        return res.status(400).json({
          error: 'El pedido no tiene un registro de pago asociado',
        });
      }

      if (row.payment_status === 'paid') {
        return res.status(400).json({ error: 'El pago ya está marcado como pagado' });
      }

      // 2) Actualizar payment -> 'paid'
      const sqlPay = `
        UPDATE payments
        SET status = 'paid'
        WHERE id = ?
          AND status = 'pending'
      `;

      conn.query(sqlPay, [row.payment_id], (err3, resultPay) => {
        if (err3) {
          console.error('Error al actualizar pago:', err3);
          return res
            .status(500)
            .json({ error: 'Error al actualizar estado del pago' });
        }

        if (resultPay.affectedRows === 0) {
          return res.status(400).json({
            error: 'No se pudo actualizar el pago (quizá ya no está en pendiente)',
          });
        }

        // 3) Actualizar order -> 'paid'
        const sqlOrder = `
          UPDATE orders
          SET status = 'paid'
          WHERE id = ?
            AND status = 'pending'
        `;

        conn.query(sqlOrder, [orderId], (err4) => {
          if (err4) {
            console.error('Error al actualizar estado del pedido:', err4);
            // No revertimos el cambio en payments para mantenerlo simple
          }

          return res.json({
            message: 'Pago simulado correctamente. El pedido ahora está pagado.',
            order_id: orderId,
          });
        });
      });
    });
  });
});

/* ===========================
   API ADMIN: gestión de pedidos / envíos
   =========================== */

// GET /api/admin/orders -> lista de TODOS los pedidos (admin)
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en /api/admin/orders:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = `
      SELECT
        o.id,
        o.status,
        o.grand_total,
        o.created_at,
        c.full_name AS customer_name,
        c.email      AS customer_email,
        COUNT(oi.id) AS items_count,
        s.status     AS shipment_status
      FROM orders o
      JOIN customers c
        ON c.id = o.customer_id
      LEFT JOIN order_items oi
        ON oi.order_id = o.id
      LEFT JOIN shipments s
        ON s.order_id = o.id
      GROUP BY
        o.id,
        o.status,
        o.grand_total,
        o.created_at,
        c.full_name,
        c.email,
        s.status
      ORDER BY o.created_at DESC
    `;

    conn.query(sql, (err2, rows) => {
      if (err2) {
        console.error('Error al obtener pedidos (admin):', err2);
        return res
          .status(500)
          .json({ error: 'Error al obtener pedidos' });
      }

      res.json(rows);
    });
  });
});

// GET /api/admin/orders/:id -> detalle completo (admin)
app.get('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const orderId = req.params.id;

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en /api/admin/orders/:id:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    const sqlOrder = `
      SELECT
        o.id,
        o.customer_id,
        o.status,
        o.subtotal,
        o.shipping_cost,
        o.tax_total,
        o.grand_total,
        o.created_at,
        c.full_name AS customer_name,
        c.email     AS customer_email
      FROM orders o
      JOIN customers c
        ON c.id = o.customer_id
      WHERE o.id = ?
      LIMIT 1
    `;

    conn.query(sqlOrder, [orderId], (err2, rows) => {
      if (err2) {
        console.error('Error al obtener pedido (admin):', err2);
        return res
          .status(500)
          .json({ error: 'Error al obtener el pedido' });
      }

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      const order = rows[0];

      const sqlItems = `
        SELECT
          oi.id,
          oi.product_id,
          p.name AS product_name,
          oi.quantity,
          oi.unit_price,
          oi.total
        FROM order_items oi
        JOIN products p
          ON p.id = oi.product_id
        WHERE oi.order_id = ?
      `;

      conn.query(sqlItems, [orderId], (err3, items) => {
        if (err3) {
          console.error('Error al obtener ítems (admin):', err3);
          return res
            .status(500)
            .json({ error: 'Error al obtener los productos del pedido' });
        }

        const sqlShipment = `
          SELECT
            id,
            status,
            tracking_code,
            carrier
          FROM shipments
          WHERE order_id = ?
          LIMIT 1
        `;


        conn.query(sqlShipment, [orderId], (err4, shipmentRows) => {
          if (err4) {
            console.error('Error al obtener envío (admin):', err4);
            return res
              .status(500)
              .json({ error: 'Error al obtener información de envío' });
          }

          const shipment = shipmentRows.length > 0 ? shipmentRows[0] : null;

          res.json({
            order,
            items,
            shipment,
          });
        });
      });
    });
  });
});


// PUT /api/admin/orders/:id/shipment -> crear/actualizar envío de un pedido
// PUT /api/admin/orders/:id/shipment -> crear/actualizar envío de un pedido
app.put('/api/admin/orders/:id/shipment', requireAdmin, (req, res) => {
  const orderId = req.params.id;

  // Acepta tanto "status" como "shipment_status" por si el front manda uno u otro
  const {
    status,
    shipment_status,
    tracking_code,
    carrier,
  } = req.body;

  const finalStatus = (status || shipment_status || 'pending').trim();
  const finalTracking = tracking_code || null;
  const finalCarrier = carrier || null;

  if (!ALLOWED_SHIPMENT_STATUSES.includes(finalStatus)) {
    return res.status(400).json({
      error:
        `Estado de envío "${finalStatus}" no permitido. ` +
        `Ajusta la lista ALLOWED_SHIPMENT_STATUSES o la columna shipments.status.`,
    });
  }

  req.getConnection((err, conn) => {
    if (err) {
      console.error('Error de conexión a BD en PUT /api/admin/orders/:id/shipment:', err);
      return res
        .status(500)
        .json({ error: 'Error de conexión a la base de datos' });
    }

    // 1) Ver si ya existe un shipment para ese pedido
    const sqlSelect = `
      SELECT id
      FROM shipments
      WHERE order_id = ?
      LIMIT 1
    `;

    conn.query(sqlSelect, [orderId], (errSel, rows) => {
      if (errSel) {
        console.error('Error al verificar envío existente:', errSel);
        return res
          .status(500)
          .json({ error: 'Error al verificar el envío del pedido' });
      }

      // 2a) Si ya existe, hacemos UPDATE
      if (rows.length > 0) {
        const shipmentId = rows[0].id;

        const sqlUpdate = `
          UPDATE shipments
          SET status = ?, tracking_code = ?, carrier = ?
          WHERE id = ?
        `;

        conn.query(
          sqlUpdate,
          [finalStatus, finalTracking, finalCarrier, shipmentId],
          (errUpd) => {
            if (errUpd) {
              console.error('Error al actualizar envío:', errUpd);
              return res
                .status(500)
                .json({ error: 'Error al actualizar el envío' });
            }

            return res.json({
              message: 'Envío actualizado correctamente',
              shipment_id: shipmentId,
              status: finalStatus,
            });
          }
        );
      } else {
        // 2b) Si no existe, creamos un nuevo envío
        const sqlInsert = `
          INSERT INTO shipments (order_id, status, tracking_code, carrier)
          VALUES (?, ?, ?, ?)
        `;

        conn.query(
          sqlInsert,
          [orderId, finalStatus, finalTracking, finalCarrier],
          (errIns, result) => {
            if (errIns) {
              console.error('Error al crear envío:', errIns);
              return res
                .status(500)
                .json({ error: 'Error al crear el envío' });
            }

            return res.status(201).json({
              message: 'Envío creado correctamente',
              shipment_id: result.insertId,
              status: finalStatus,
            });
          }
        );
      }
    });
  });
});




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

// Página de gestión de pedidos (admin)
app.get('/admin/orders', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-orders.html'));
});


// Página de perfil de usuario (cliente/admin)
app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

// Página del carrito
app.get('/cart', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'views', 'cart.html'));
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

-- =========================================
--        Raíces Chiapanecas - Esquema
--  - Crea BD 'raiceschiapanecas'
--  - Crea usuario 'raiceschiapanecas'@'localhost'
--  - Otorga privilegios
--  - Crea tablas principales
--  - Inserta Datos
-- ===========================================
-- 1) Base de datos
DROP DATABASE IF EXISTS raiceschiapanecas;
CREATE DATABASE raiceschiapanecas CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE raiceschiapanecas;

-- 2) Usuario del proyecto
CREATE USER IF NOT EXISTS 'raiceschiapanecas'@'localhost' IDENTIFIED BY 'hellofriend';

-- 3) Privilegios del usuario del proyecto sobre la BD
GRANT ALL PRIVILEGES ON raiceschiapanecas.* TO 'raiceschiapanecas'@'localhost';
FLUSH PRIVILEGES;

-- 4) Tablas principales

-- 4.1 Productores locales (storytelling/comercio justo)
CREATE TABLE producers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  description   TEXT,
  contact_email VARCHAR(120),
  phone         VARCHAR(30),
  region        VARCHAR(120),           -- p.ej. Altos de Chiapas
  active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4.2 Categorías (árbol simple)
CREATE TABLE categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  parent_id   INT NULL,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cat_parent
    FOREIGN KEY (parent_id) REFERENCES categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4.3 Productos
CREATE TABLE products (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  category_id   INT NOT NULL,
  producer_id   INT NULL,
  name          VARCHAR(150) NOT NULL,
  slug          VARCHAR(180) NOT NULL UNIQUE,
  sku           VARCHAR(60) UNIQUE,
  description   TEXT,
  price         DECIMAL(10,2) NOT NULL,
  status        ENUM('active','inactive','draft') NOT NULL DEFAULT 'active',
  weight_grams  INT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prod_cat
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_prod_producer
    FOREIGN KEY (producer_id) REFERENCES producers(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4.4 Imágenes de producto
CREATE TABLE product_images (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT NOT NULL,
  url         VARCHAR(255) NOT NULL,
  alt         VARCHAR(150),
  is_primary  TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_img_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4.5 Inventario
CREATE TABLE stock (
  product_id INT PRIMARY KEY,
  quantity   INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4.6 Clientes
CREATE TABLE customers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  phone         VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,          -- contraseña hasheada (bcrypt)
  role          ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4.7 Direcciones (envío/facturación)
CREATE TABLE addresses (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  customer_id   INT NOT NULL,
  type          ENUM('shipping','billing') NOT NULL,
  street        VARCHAR(180) NOT NULL,
  city          VARCHAR(100) NOT NULL,
  state         VARCHAR(100) NOT NULL,
  postal_code   VARCHAR(20)  NOT NULL,
  country       VARCHAR(100) NOT NULL DEFAULT 'México',
  is_default    TINYINT(1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_addr_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4.8 Carritos
CREATE TABLE carts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  customer_id  INT NULL,
  status       ENUM('open','converted','abandoned') NOT NULL DEFAULT 'open',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NULL,
  CONSTRAINT fk_cart_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4.9 Ítems del carrito
CREATE TABLE cart_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  cart_id    INT NOT NULL,
  product_id INT NOT NULL,
  quantity   INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ci_cart
    FOREIGN KEY (cart_id) REFERENCES carts(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ci_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE KEY uq_cart_product (cart_id, product_id)
) ENGINE=InnoDB;

-- 4.10 Pedidos
CREATE TABLE orders (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  customer_id      INT NOT NULL,
  shipping_addr_id INT NULL,
  billing_addr_id  INT NULL,
  status           ENUM('pending','paid','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
  subtotal         DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_cost    DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_total        DECIMAL(10,2) NOT NULL DEFAULT 0,
  grand_total      DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_order_ship_addr
    FOREIGN KEY (shipping_addr_id) REFERENCES addresses(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_order_bill_addr
    FOREIGN KEY (billing_addr_id) REFERENCES addresses(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4.11 Ítems del pedido
CREATE TABLE order_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT NOT NULL,
  product_id INT NOT NULL,
  quantity   INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total      DECIMAL(10,2) AS (quantity * unit_price) STORED,
  CONSTRAINT fk_oi_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_oi_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4.12 Pagos
CREATE TABLE payments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  order_id      INT NOT NULL,
  method        ENUM('card','transfer','oxxo','cash','other') NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  status        ENUM('pending','authorized','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  reference     VARCHAR(120),       -- id de pasarela o referencia
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4.13 Envíos (alineado con el frontend y el panel admin)
CREATE TABLE shipments (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  order_id       INT NOT NULL,
  carrier        VARCHAR(60),        -- DHL/FedEx/Estafeta, etc.
  tracking_code  VARCHAR(80),
  status ENUM(
    'pending',
    'processing',
    'shipped',
    'out_for_delivery',
    'delivered',
    'returned',
    'lost'
  ) NOT NULL DEFAULT 'pending',
  notes          TEXT,
  shipped_at     DATETIME NULL,
  delivered_at   DATETIME NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ship_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;


/* ===========================================
   5) DATOS
   Categorías, productores, productos y stock
   =========================================== */

-- 5.1 Categorías
INSERT INTO categories (name, slug) VALUES
  ('Café',       'cafe'),
  ('Miel',       'miel'),
  ('Cacao',      'cacao'),
  ('Textiles',   'textiles'),
  ('Artesanías', 'artesanias');

-- 5.2 Productores
INSERT INTO producers (name, region, description, contact_email, phone) VALUES
  ('Cooperativa Café Altos',
   'San Cristóbal de las Casas',
   'Pequeños caficultores de la región de los Altos de Chiapas.',
   'contacto@cafealtos.mx',
   '9610000001'),

  ('Mielera El Trópico',
   'Tuxtla Gutiérrez',
   'Apicultores de miel multifloral y monofloral chiapaneca.',
   'ventas@mieltropico.mx',
   '9610000002'),

  ('Cacao Selva Zoque',
   'Ocozocoautla',
   'Productores de cacao fino de aroma de la Selva Zoque.',
   'contacto@cacaoselvazoque.mx',
   '9610000003'),

  ('Textiles Los Altos',
   'San Juan Chamula',
   'Artesanas tejedoras en telar de cintura.',
   'ventas@textilesaltos.mx',
   '9610000004'),

  ('Artesanos del Cañón',
   'Chiapa de Corzo',
   'Colectivo de artesanos de barro y madera.',
   'contacto@artesanoscanion.mx',
   '9610000005'),

  ('Colectivo Raíces Sierra',
   'Sierra de Chiapas',
   'Productores mixtos de café, miel y cacao.',
   'info@raicessierra.mx',
   '9610000006');

-- NOTA:
-- categories:  1 = Café, 2 = Miel, 3 = Cacao, 4 = Textiles, 5 = Artesanías
-- producers:   1..6 en el orden anterior


/* ======================
   5.3 Productos
   SOLO 2 por categoría
   ====================== */

-- 5.3.1 Café (category_id = 1)
INSERT INTO products
  (category_id, producer_id, name, slug, sku, description, price, status, weight_grams)
VALUES
  (1, 1,
   'Café de altura 250g',
   'cafe-altura-250',
   'CAF-250',
   'Café arábica de altura tostado medio, ideal para prensa francesa.',
   120.00, 'active', 250),

  (1, 1,
   'Café de altura 500g',
   'cafe-altura-500',
   'CAF-500',
   'Café de altura chiapaneco, notas de chocolate y nuez.',
   180.00, 'active', 500);

-- 5.3.2 Miel (category_id = 2)
INSERT INTO products
  (category_id, producer_id, name, slug, sku, description, price, status, weight_grams)
VALUES
  (2, 2,
   'Miel multifloral 500g',
   'miel-multifloral-500',
   'MIL-MULTI-500',
   'Miel multifloral chiapaneca de abejas criollas.',
   140.00, 'active', 500),

  (2, 2,
   'Miel multifloral 1kg',
   'miel-multifloral-1000',
   'MIL-MULTI-1000',
   'Miel multifloral para uso familiar o negocio.',
   220.00, 'active', 1000);

-- 5.3.3 Cacao (category_id = 3)
INSERT INTO products
  (category_id, producer_id, name, slug, sku, description, price, status, weight_grams)
VALUES
  (3, 3,
   'Cacao en tableta amargo 200g',
   'cacao-tableta-amargo-200',
   'CAC-TAB-AM-200',
   'Tabletas de cacao amargo 70% cacao, para bebida o postre.',
   85.00, 'active', 200),

  (3, 3,
   'Cacao en tableta con leche 200g',
   'cacao-tableta-leche-200',
   'CAC-TAB-LE-200',
   'Tabletas de cacao con leche, dulzor equilibrado.',
   80.00, 'active', 200);

-- 5.3.4 Textiles (category_id = 4)
INSERT INTO products
  (category_id, producer_id, name, slug, sku, description, price, status, weight_grams)
VALUES
  (4, 4,
   'Rebozo de lana tradicional',
   'textil-rebozo-lana-chiapas',
   'TXT-REB-LANA',
   'Rebozo de lana tejido en telar de cintura, diseño tradicional chiapaneco.',
   650.00, 'active', NULL),

  (4, 4,
   'Blusa bordada San Juan',
   'textil-blusa-bordada-san-juan',
   'TXT-BLU-SJ',
   'Blusa de manta con bordado floral típico de San Juan Chamula.',
   480.00, 'active', NULL);

-- 5.3.5 Artesanías (category_id = 5)
INSERT INTO products
  (category_id, producer_id, name, slug, sku, description, price, status, weight_grams)
VALUES
  (5, 5,
   'Vasija de barro negro',
   'artesanias-vasija-barro-negro',
   'ART-VAS-BN',
   'Vasija de barro negro pulido, hecha a mano.',
   380.00, 'active', NULL),

  (5, 5,
   'Figuras de animales en madera',
   'artesanias-figuras-animales-madera',
   'ART-FIG-ANIM',
   'Figuras talladas en madera representando fauna chiapaneca.',
   320.00, 'active', NULL);


/* ======================
   5.4 Stock inicial
   (2 productos por categoría)
   ====================== */

INSERT INTO stock (product_id, quantity)
SELECT id, 80 FROM products WHERE slug = 'cafe-altura-250'
UNION ALL
SELECT id, 60 FROM products WHERE slug = 'cafe-altura-500'
UNION ALL
SELECT id, 70 FROM products WHERE slug = 'miel-multifloral-500'
UNION ALL
SELECT id, 50 FROM products WHERE slug = 'miel-multifloral-1000'
UNION ALL
SELECT id, 40 FROM products WHERE slug = 'cacao-tableta-amargo-200'
UNION ALL
SELECT id, 40 FROM products WHERE slug = 'cacao-tableta-leche-200'
UNION ALL
SELECT id, 15 FROM products WHERE slug = 'textil-rebozo-lana-chiapas'
UNION ALL
SELECT id, 20 FROM products WHERE slug = 'textil-blusa-bordada-san-juan'
UNION ALL
SELECT id, 25 FROM products WHERE slug = 'artesanias-vasija-barro-negro'
UNION ALL
SELECT id, 20 FROM products WHERE slug = 'artesanias-figuras-animales-madera';


/* ======================
   5.5 Usuarios de prueba
   ====================== */

INSERT INTO customers (full_name, email, phone, password_hash, role)
VALUES
  ('Admin',   'admin@c.com',   '9610000000', '$2b$10$xhhyoG3YIgwgoF1LKxdJ9OthXu8pp/g2i8g8gvXAbUKxMuKj9ki7S', 'admin'),
  ('Cliente', 'cliente@c.com', '9610000001', '$2b$10$0gktJFGetWe7KZTWyJdOieBUgW47fzQYB.50GgLLYcQLTwvy3kwoG', 'customer');

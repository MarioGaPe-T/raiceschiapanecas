-- =========================================
--        Raíces Chiapanecas - Esquema
--  - Crea BD 'raiceschiapanecas'
--  - Crea usuario 'raiceschiapanecas'@'localhost'
--  - Otorga privilegios
--  - Crea tablas principales
--  - Inserta Datos

-- Probado en XAMPP(LAMPP) for Linux 8.2.12-0:
-- Apache 2.4.58
-- MariaDB 10.4.32
-- PHP 8.2.12
-- phpMyAdmin 5.2.1
-- Ejecucion: /opt/lampp/bin/mysql -u root -p < db/schema.sql
-- 
-- Probado en XAMPP for Windows 8.2.12-0:
-- Apache 2.4.58
-- MariaDB 10.4.32
-- PHP 8.2.12
-- phpMyAdmin 5.2.1
-- Ejecución: "C:\xampp\mysql\bin\mysql.exe" --binary-mode=1 -u root -p < schema.sql
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
  reference     VARCHAR(120),       -- id de pasarela
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4.13 Envíos
CREATE TABLE shipments (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  order_id       INT NOT NULL,
  carrier        VARCHAR(60),        -- DHL/FedEx/Estafeta, etc.
  tracking_code  VARCHAR(80),
  status         ENUM('pending','in_transit','delivered','lost','returned') DEFAULT 'pending',
  shipped_at     DATETIME NULL,
  delivered_at   DATETIME NULL,
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

-- NOTA: después de esto, los IDs quedan así:
-- categories:  1 = Café, 2 = Miel, 3 = Cacao, 4 = Textiles, 5 = Artesanías
-- producers:   1..6 en el orden anterior


/* ======================
   5.3 Productos
   10 por categoría
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
   180.00, 'active', 500),

  (1, 1,
   'Café molido para espresso 250g',
   'cafe-espresso-250',
   'CAF-ESP-250',
   'Mezcla especial para espresso, molienda fina y crema intensa.',
   135.00, 'active', 250),

  (1, 6,
   'Café orgánico en grano 500g',
   'cafe-organico-500',
   'CAF-ORG-500',
   'Café orgánico certificado de pequeños productores de la Sierra.',
   210.00, 'active', 500),

  (1, 6,
   'Café de olla con canela 250g',
   'cafe-olla-canela-250',
   'CAF-OLLA-250',
   'Mezcla para café de olla con piloncillo y canela.',
   110.00, 'active', 250),

  (1, 1,
   'Café descafeinado 250g',
   'cafe-descafeinado-250',
   'CAF-DEC-250',
   'Café descafeinado suave, perfecto para la noche.',
   125.00, 'active', 250),

  (1, 1,
   'Café tostado oscuro 1kg',
   'cafe-oscuro-1000',
   'CAF-OSC-1000',
   'Café intenso tipo espresso, tostado oscuro.',
   320.00, 'active', 1000),

  (1, 6,
   'Café con cardamomo 250g',
   'cafe-cardamomo-250',
   'CAF-CAR-250',
   'Café con ligero toque de cardamomo, aroma especiado.',
   140.00, 'active', 250),

  (1, 1,
   'Café gourmet selección especial 500g',
   'cafe-gourmet-500',
   'CAF-GOU-500',
   'Selección de granos de especialidad de Chiapas.',
   260.00, 'active', 500),

  (1, 6,
   'Café soluble artesanal 200g',
   'cafe-soluble-200',
   'CAF-SOL-200',
   'Café soluble elaborado a partir de granos chiapanecos.',
   150.00, 'active', 200);


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
   220.00, 'active', 1000),

  (2, 6,
   'Miel orgánica 500g',
   'miel-organica-500',
   'MIL-ORG-500',
   'Miel orgánica certificada, libre de agroquímicos.',
   180.00, 'active', 500),

  (2, 2,
   'Miel de azahar 500g',
   'miel-azahar-500',
   'MIL-AZA-500',
   'Miel monofloral de azahar, aroma cítrico suave.',
   190.00, 'active', 500),

  (2, 2,
   'Miel cremosa 300g',
   'miel-cremosa-300',
   'MIL-CREM-300',
   'Miel batida de textura cremosa, ideal para untar.',
   120.00, 'active', 300),

  (2, 2,
   'Miel en panal 400g',
   'miel-en-panales-400',
   'MIL-PANAL-400',
   'Panal de miel sellado, directo de la colmena.',
   210.00, 'active', 400),

  (2, 6,
   'Miel con chipilín 250g',
   'miel-chipilin-250',
   'MIL-CHIP-250',
   'Infusión de miel con chipilín, sabor típico chiapaneco.',
   130.00, 'active', 250),

  (2, 6,
   'Miel con manzanilla 250g',
   'miel-manzanilla-250',
   'MIL-MANZ-250',
   'Miel con extracto de manzanilla, ideal para infusiones.',
   130.00, 'active', 250),

  (2, 2,
   'Polen de abeja 300g',
   'miel-polen-300',
   'MIL-POL-300',
   'Granulado de polen de abeja, suplemento natural.',
   160.00, 'active', 300),

  (2, 2,
   'Miel mezcla de campo 750g',
   'miel-mezcla-campo-750',
   'MIL-CAMP-750',
   'Miel de distintas floraciones de la región.',
   230.00, 'active', 750);


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
   80.00, 'active', 200),

  (3, 3,
   'Cacao en polvo 500g',
   'cacao-polvo-500',
   'CAC-POL-500',
   'Cacao en polvo sin azúcar, ideal para repostería.',
   160.00, 'active', 500),

  (3, 6,
   'Cacao orgánico 250g',
   'cacao-organico-250',
   'CAC-ORG-250',
   'Cacao orgánico molido, proveniente de la Sierra de Chiapas.',
   110.00, 'active', 250),

  (3, 3,
   'Cacao puro en polvo 250g',
   'cacao-org-puro-250',
   'CAC-PUR-250',
   'Cacao 100% puro, sin mezclas.',
   115.00, 'active', 250),

  (3, 3,
   'Grano de cacao tostado 300g',
   'cacao-grano-tostado-300',
   'CAC-GRAN-300',
   'Granos de cacao tostados listos para moler o infusionar.',
   140.00, 'active', 300),

  (3, 6,
   'Bebida instantánea de cacao 400g',
   'cacao-bebida-instant-400',
   'CAC-INST-400',
   'Mezcla de cacao con panela, lista para disolver.',
   150.00, 'active', 400),

  (3, 3,
   'Nibs de cacao 200g',
   'cacao-nibs-200',
   'CAC-NIBS-200',
   'Trozos de cacao tostado, ideales para toppings y snacks.',
   130.00, 'active', 200),

  (3, 6,
   'Mezcla cacao y café 300g',
   'cacao-mix-cafe-300',
   'CAC-MIX-300',
   'Mezcla soluble de cacao con café de altura.',
   145.00, 'active', 300),

  (3, 3,
   'Manteca de cacao 250g',
   'cacao-manteca-250',
   'CAC-MANT-250',
   'Manteca de cacao para repostería y cosmética natural.',
   170.00, 'active', 250);


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
   480.00, 'active', NULL),

  (4, 4,
   'Camino de mesa bordado',
   'textil-camino-mesa-bordado',
   'TXT-CAM-MESA',
   'Camino de mesa con bordados geométricos de colores vivos.',
   320.00, 'active', NULL),

  (4, 4,
   'Mantel grande con flores',
   'textil-mantel-grande-flores',
   'TXT-MANT-FLOR',
   'Mantel grande para comedor, con flores bordadas a mano.',
   780.00, 'active', NULL),

  (4, 4,
   'Funda de cojín geométrica',
   'textil-funda-cojin-geom',
   'TXT-FUN-COJ',
   'Funda de cojín con patrones geométricos tradicionales.',
   220.00, 'active', NULL),

  (4, 4,
   'Morral tejido en telar',
   'textil-morral-telar',
   'TXT-MORRAL',
   'Morral de algodón tejido en telar de cintura, muy resistente.',
   350.00, 'active', NULL),

  (4, 4,
   'Bolsa de mano chiapaneca',
   'textil-bolsa-mano-chiapas',
   'TXT-BOL-MANO',
   'Bolsa de mano con aplicaciones textiles de Chiapas.',
   390.00, 'active', NULL),

  (4, 4,
   'Juego de servilletas bordadas',
   'textil-servilletas-bordadas',
   'TXT-SERV-SET',
   'Set de 6 servilletas con bordado artesanal.',
   260.00, 'active', NULL),

  (4, 4,
   'Chal rosa Chiapas',
   'textil-chal-rosa-chiapas',
   'TXT-CHAL-ROS',
   'Chal ligero color rosa con detalles en flecos.',
   420.00, 'active', NULL),

  (4, 4,
   'Camisa de lino bordada',
   'textil-camisa-lino-bordado',
   'TXT-CAM-LINO',
   'Camisa de lino con bordado discreto en el pecho.',
   620.00, 'active', NULL);


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
   320.00, 'active', NULL),

  (5, 5,
   'Máscara de danza tradicional',
   'artesanias-mascara-danza',
   'ART-MAS-DAN',
   'Máscara utilizada en danzas tradicionales de la región.',
   450.00, 'active', NULL),

  (5, 5,
   'Portavasos de madera',
   'artesanias-portavasos-madera',
   'ART-PTV-MAD',
   'Set de 4 portavasos tallados en madera.',
   160.00, 'active', NULL),

  (5, 5,
   'Portallaves rústico',
   'artesanias-portallaves-rustico',
   'ART-PORT-LLAV',
   'Portallaves de madera con detalles pintados a mano.',
   210.00, 'active', NULL),

  (5, 5,
   'Llavero textil',
   'artesanias-llavero-textil',
   'ART-LLAV-TXT',
   'Llavero con miniatura de textil bordado.',
   70.00, 'active', NULL),

  (5, 5,
   'Colgante de pared artesanal',
   'artesanias-colgante-pared',
   'ART-COL-PAR',
   'Colgante decorativo para pared con fibras naturales.',
   290.00, 'active', NULL),

  (5, 5,
   'Portavelas de barro',
   'artesanias-portavelas-barro',
   'ART-PORT-VEL',
   'Portavelas de barro con perforaciones decorativas.',
   190.00, 'active', NULL),

  (5, 5,
   'Caja bordada para joyería',
   'artesanias-caja-bordada',
   'ART-CJ-BORD',
   'Caja forrada con textil bordado para guardar accesorios.',
   330.00, 'active', NULL),

  (5, 5,
   'Imanes decorativos Chiapas',
   'artesanias-imanes-chiapas',
   'ART-IMAN-CH',
   'Set de imanes con motivos turísticos de Chiapas.',
   120.00, 'active', NULL);


/* ======================
   5.4 Stock inicial
   ====================== 
*/

INSERT INTO stock (product_id, quantity)
SELECT id, 80 FROM products WHERE slug = 'cafe-altura-250'
UNION ALL
SELECT id, 60 FROM products WHERE slug = 'cafe-altura-500'
UNION ALL
SELECT id, 50 FROM products WHERE slug = 'cafe-espresso-250'
UNION ALL
SELECT id, 40 FROM products WHERE slug = 'cafe-organico-500'
UNION ALL
SELECT id, 45 FROM products WHERE slug = 'cafe-olla-canela-250'
UNION ALL
SELECT id, 35 FROM products WHERE slug = 'cafe-descafeinado-250'
UNION ALL
SELECT id, 30 FROM products WHERE slug = 'cafe-oscuro-1000'
UNION ALL
SELECT id, 25 FROM products WHERE slug = 'cafe-cardamomo-250'
UNION ALL
SELECT id, 30 FROM products WHERE slug = 'cafe-gourmet-500'
UNION ALL
SELECT id, 40 FROM products WHERE slug = 'cafe-soluble-200'
UNION ALL

SELECT id, 70 FROM products WHERE slug = 'miel-multifloral-500'
UNION ALL
SELECT id, 50 FROM products WHERE slug = 'miel-multifloral-1000'
UNION ALL
SELECT id, 40 FROM products WHERE slug = 'miel-organica-500'
UNION ALL
SELECT id, 35 FROM products WHERE slug = 'miel-azahar-500'
UNION ALL
SELECT id, 45 FROM products WHERE slug = 'miel-cremosa-300'
UNION ALL
SELECT id, 25 FROM products WHERE slug = 'miel-en-panales-400'
UNION ALL
SELECT id, 30 FROM products WHERE slug = 'miel-chipilin-250'
UNION ALL
SELECT id, 30 FROM products WHERE slug = 'miel-manzanilla-250'
UNION ALL
SELECT id, 20 FROM products WHERE slug = 'miel-polen-300'
UNION ALL
SELECT id, 30 FROM products WHERE slug = 'miel-mezcla-campo-750'
UNION ALL

SELECT id, 40 FROM products WHERE slug = 'cacao-tableta-amargo-200'
UNION ALL
SELECT id, 40 FROM products WHERE slug = 'cacao-tableta-leche-200'
UNION ALL
SELECT id, 35 FROM products WHERE slug = 'cacao-polvo-500'
UNION ALL
SELECT id, 30 FROM products WHERE slug = 'cacao-organico-250'
UNION ALL
SELECT id, 30 FROM products WHERE slug = 'cacao-org-puro-250'
UNION ALL
SELECT id, 25 FROM products WHERE slug = 'cacao-grano-tostado-300'
UNION ALL
SELECT id, 35 FROM products WHERE slug = 'cacao-bebida-instant-400'
UNION ALL
SELECT id, 25 FROM products WHERE slug = 'cacao-nibs-200'
UNION ALL
SELECT id, 20 FROM products WHERE slug = 'cacao-mix-cafe-300'
UNION ALL
SELECT id, 20 FROM products WHERE slug = 'cacao-manteca-250'
UNION ALL

SELECT id, 15 FROM products WHERE slug = 'textil-rebozo-lana-chiapas'
UNION ALL
SELECT id, 20 FROM products WHERE slug = 'textil-blusa-bordada-san-juan'
UNION ALL
SELECT id, 18 FROM products WHERE slug = 'textil-camino-mesa-bordado'
UNION ALL
SELECT id, 10 FROM products WHERE slug = 'textil-mantel-grande-flores'
UNION ALL
SELECT id, 25 FROM products WHERE slug = 'textil-funda-cojin-geom'
UNION ALL
SELECT id, 20 FROM products WHERE slug = 'textil-morral-telar'
UNION ALL
SELECT id, 18 FROM products WHERE slug = 'textil-bolsa-mano-chiapas'
UNION ALL
SELECT id, 30 FROM products WHERE slug = 'textil-servilletas-bordadas'
UNION ALL
SELECT id, 15 FROM products WHERE slug = 'textil-chal-rosa-chiapas'
UNION ALL
SELECT id, 12 FROM products WHERE slug = 'textil-camisa-lino-bordado'
UNION ALL

SELECT id, 25 FROM products WHERE slug = 'artesanias-vasija-barro-negro'
UNION ALL
SELECT id, 20 FROM products WHERE slug = 'artesanias-figuras-animales-madera'
UNION ALL
SELECT id, 10 FROM products WHERE slug = 'artesanias-mascara-danza'
UNION ALL
SELECT id, 30 FROM products WHERE slug = 'artesanias-portavasos-madera'
UNION ALL
SELECT id, 18 FROM products WHERE slug = 'artesanias-portallaves-rustico'
UNION ALL
SELECT id, 50 FROM products WHERE slug = 'artesanias-llavero-textil'
UNION ALL
SELECT id, 20 FROM products WHERE slug = 'artesanias-colgante-pared'
UNION ALL
SELECT id, 22 FROM products WHERE slug = 'artesanias-portavelas-barro'
UNION ALL
SELECT id, 15 FROM products WHERE slug = 'artesanias-caja-bordada'
UNION ALL
SELECT id, 40 FROM products WHERE slug = 'artesanias-imanes-chiapas';

INSERT INTO customers (full_name, email, phone, password_hash, role)
VALUES
  ('Admin',   'admin@c.com',   '9610000000', '$2b$10$xhhyoG3YIgwgoF1LKxdJ9OthXu8pp/g2i8g8gvXAbUKxMuKj9ki7S', 'admin'),
  ('Cliente',   'cliente@c.com', '9610000001', '$2b$10$0gktJFGetWe7KZTWyJdOieBUgW47fzQYB.50GgLLYcQLTwvy3kwoG', 'customer');


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

-- 5) Datos de ejemplo mínimos (opcional)
INSERT INTO categories (name, slug) VALUES
 ('Café','cafe'), ('Miel','miel'), ('Cacao','cacao'),
 ('Textiles','textiles'), ('Artesanías','artesanias');

INSERT INTO producers (name, region) VALUES
 ('Cooperativa Café Altos','San Cristóbal'),
 ('Mielera El Trópico','Tuxtla Gutiérrez');

INSERT INTO products (category_id, producer_id, name, slug, sku, description, price, status, weight_grams)
VALUES
 (1, 1, 'Café de altura 500g', 'cafe-altura-500', 'CAF-500', 'Café arábica de altura', 180.00, 'active', 500),
 (2, 2, 'Miel multifloral 1kg', 'miel-multifloral-1kg', 'MIL-1000', 'Miel chiapaneca', 150.00, 'active', 1000);

INSERT INTO stock (product_id, quantity) VALUES (1, 50), (2, 30);

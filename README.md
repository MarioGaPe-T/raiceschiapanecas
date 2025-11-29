# Proyecto Raíces Chiapanecas 🌱

Tienda en línea de productos regionales chiapanecos (café, miel, cacao, textiles y artesanías), que conecta productores locales con consumidores.

El proyecto promueve el comercio justo, la identidad cultural y la sostenibilidad.

## 1. Requisitos

* Node.js v18 o superior
* XAMPP / LAMPP con:
  * MariaDB 10.4.32
  * phpMyAdmin 5.2.1

Probado en:

* Ubuntu 24.04.2 LTS x86_64 con XAMPP (LAMPP) for Linux 8.2.12-0
* Windows 11 25H2 (virtualizado) con XAMPP for Windows 8.2.12-0

## 2. Instalación de dependencias

Desde la carpeta raíz del proyecto (donde está index.js):

1. Si el proyecto se inicia desde cero, inicializar npm:
  Escribir en la terminal:
  npm init -y

2. Instalar los módulos necesarios:
npm install express mysql2 express-myconnection morgan bcryptjs express-session

3. (Opcional, para desarrollo con recarga automática):
npm install --save-dev nodemon

4. Para iniciar la aplicación:
  * Modo normal: node index.js
  * Con nodemon: npx nodemon index.js

El servidor escucha en:
http://localhost:8080

## 3. Creación de la base de datos

El script db/schema.sql crea automáticamente:
* La base de datos raiceschiapanecas
* El usuario raiceschiapanecas@localhost con contraseña hellofriend
* Todas las tablas necesarias:
  - producers, categories, products, product_images, stock
  - customers, addresses
  - carts, cart_items
  - orders, order_items, payments, shipments
* Datos:
  - Categorías (Café, Miel, Cacao, Textiles, Artesanías)
  - Productores
  - 10 productos por categoría con su stock
  - Usuario administrador y usuario cliente

### 3.1 Ejecución en Linux (XAMPP/LAMPP)

Desde la carpeta raíz del proyecto ejecutar en la terminal:
- /opt/lampp/bin/mysql -u root -p < db/schema.sql

### 3.2 Ejecución en Windows (XAMPP)

Desde la carpeta db del proyecto ejecutar en la terminal:
- "C:\xampp\mysql\bin\mysql.exe" --binary-mode=1 -u root -p < schema.sql

### 3.3 Verificación rápida en MySQL / phpMyAdmin

Comprobar:
  * SHOW DATABASES;
  * USE raiceschiapanecas;
  * SHOW TABLES;

Debe aparecer la base de datos raiceschiapanecas con todas las tablas (customers, products, orders, etc.).

## 4. Usuarios de prueba

En el schema.sql ya vienen dos usuarios creados en la tabla customers:

* Administrador
  - Email: admin@c.com
  - Password: admin1
  - Rol: admin

* Cliente
  - Email: cliente@c.com
  - Password: liente1
  - Rol: customer

Las contraseñas se guardan en la base de datos como password_hash usando bcrypt; los hashes ya están generados dentro del schema.sql.

## 5. Conexión a la base de datos y middlewares

La configuración de la base de datos se encuentra en config/db.js y utiliza:
* mysql2
* express-myconnection

En index.js se usan los middlewares:

* morgan → log de peticiones HTTP
* express.json y express.urlencoded → parseo de JSON y formularios
* express.static → servir archivos estáticos (CSS, JS, imágenes) desde public
* express-session → sesiones para login y manejo de roles
* express-myconnection → conexión a MySQL/MariaDB con el usuario raiceschiapanecas

La conexión se realiza con los datos:

- host: localhost
- user: raiceschiapanecas
- password: hellofriend
- database: raiceschiapanecas
- port: 3306

## 6. Estructura del proyecto

Estructura general (resumen):

* index.js
Punto de entrada del servidor (Express). Configura middlewares, sesiones, conexión a BD, rutas de admin, rutas públicas y APIs.

* Carpeta config/
  - db.js → Configuración del pool de conexión MySQL/MariaDB.

* Carpeta controllers/
  - Lógica de cada recurso:
  - authController.js
  - customerController.js
  - producerController.js
  - productController.js
  - categoryController.js

* Carpeta models/
Definición de modelos base (mapeo simple de filas):
  - customer.js
  - producer.js
  - product.js
  - category.js

* Carpeta services/
Capa de acceso a datos (consultas SQL):
  - customerService.js
  - producerService.js
  - productService.js
  - categoryService.js

* Carpeta routes/
Definición de rutas Express:
  - auth.js → /register, /login, /logout
  - customers.js → CRUD de clientes en el panel admin
  - producers.js → CRUD de productores
  - products.js → CRUD de productos
  - categories.js → CRUD de categorías

* Carpeta views/ (archivos HTML puros):
  - shop.html → Tienda pública (home)
  - login.html
  - register.html
  - profile.html → Perfil del usuario
  - admin.html → Panel principal de administración
  - customers.html → Panel admin de clientes
  - producers.html → Panel admin de productores
  - products.html → Panel admin de productos
  - categories.html → Panel admin de categorías

* Carpeta public/:
  - css/styles.css → Hoja de estilos general (formularios, paneles y tienda).

* Carpeta db/:
  - schema.sql → Script SQL con creación de BD, tablas, datos de ejemplo y usuarios de prueba.

## 7. Rutas principales de la aplicación
### 7. 1 Ruta raíz – Tienda pública

GET /
Devuelve views/shop.html.

* Este archivo:

Muestra el header de tienda con logo, buscador, carrito y botones de login o perfil (según si hay sesión o no).

Muestra un bloque tipo “hero” con texto de presentación del proyecto.

Muestra una barra de categorías (explorar por categoría).

Muestra una rejilla de productos recomendados.

* La tienda usa dos endpoints públicos (solo lectura):

GET /api/categories
Devuelve un JSON con las categorías (id, name, slug).

GET /api/products
Devuelve un JSON con los productos activos y los nombres de categoría y productor.

* El front (shop.html) hace filtros por categoría y búsqueda por texto desde el navegador, usando JavaScript.

### 7.2 Autenticación y sesión

Manejada en las rutas de routes/auth.js y en authController.js.

* Rutas:

GET /register
Devuelve el formulario de registro (register.html).

POST /register
Crea un nuevo cliente en la tabla customers:

Guarda full_name, email, phone (opcional) y password_hash (bcrypt).

Asigna rol por defecto customer.

GET /login
Devuelve el formulario de login (login.html).

POST /login
Verifica correo y contraseña.
Si son correctos, guarda en sesión un objeto como:

id

full_name

email

role (admin o customer)

Si es admin, lo redirige a /admin.
Si es cliente, lo redirige a / (tienda).

POST /logout
Destruye la sesión (cierra sesión) y redirige a la tienda.

GET /me
Devuelve información simple sobre la sesión en formato JSON:
Si no hay sesión: loggedIn = false
Si hay sesión: loggedIn = true y datos del usuario (id, full_name, email, role).

El shop.html consulta /me para saber si debe mostrar “Iniciar sesión / Crear cuenta” o “Hola, Nombre · Perfil · Cerrar sesión”.

### 7.3 Perfil del usuario

GET /profile
Devuelve views/profile.html.
Solo accesible si el usuario ha iniciado sesión (admin o customer). Si no, redirige a /login.

APIs utilizadas por el perfil:

GET /api/profile
Devuelve la información de la tabla customers para el usuario actual (id, full_name, email, phone, role, created_at).

PUT /api/profile
Permite actualizar full_name, email y phone.
También actualiza la información en la sesión (req.session.user).

GET /api/profile/address
Devuelve la dirección principal de envío del usuario a partir de la tabla addresses.
Si no hay dirección, devuelve null.

POST /api/profile/address
Si se envía un id, actualiza una dirección existente.
Si no se envía id, crea una nueva dirección y la marca como is_default = 1.
Campos principales: street, city, state, postal_code, country, type (shipping/billing).

PUT /api/profile/password
Recibe la contraseña actual y la nueva contraseña:

Verifica que la contraseña actual coincida con el password_hash guardado.

Si coincide, genera un nuevo hash y lo actualiza en la bd.

Todas las rutas /api/profile... requieren que el usuario esté logueado; en caso contrario devuelven error 401.

### 7.4 Panel de administración

Solo para usuarios con role = 'admin'.

Middleware en index.js:

requireAdmin revisa:

Que exista req.session.user

Que req.session.user.role === 'admin'

Si no está logueado, redirige a /login.

Si está logueado pero no es admin, devuelve 403.

Rutas de panel:

GET /admin
Devuelve views/admin.html, que muestra un menú con:

Gestión de clientes

Gestión de productores

Gestión de categorías

Gestión de productos

Cada sección tiene su propio panel HTML y sus rutas CRUD (JSON).

#### 7.4.1 Clientes (customers)

GET /customers/panel → customers.html

GET /customers → lista JSON

GET /customers/:id

PUT /customers/:id

DELETE /customers/:id

#### 7.4.2 Productores (producers)

GET /producers/panel → producers.html

GET /producers

GET /producers/:id

POST /producers

PUT /producers/:id

DELETE /producers/:id

#### 7.4.3 Categorías (categories)

GET /categories/panel → categories.html

GET /categories

GET /categories/:id

POST /categories

PUT /categories/:id

DELETE /categories/:id

#### 7.4.4 Productos (products)

GET /products/panel → products.html

GET /products → lista JSON de productos con nombres de categoría y productor

GET /products/meta → envía listas de categorías y productores para llenar select en el formulario

POST /products → crea un producto nuevo

PUT /products/:id → actualiza producto (si no se envía slug, se genera desde el nombre)

DELETE /products/:id → elimina producto

## 8. Carrito, pedidos y pagos (estructura para futuras fases)

En esta entrega el enfoque está en:

Autenticación y roles

Panel admin para catálogos (clientes, productores, categorías, productos)

Tienda pública con productos filtrables y perfil de usuario con dirección

Sin embargo, el schema.sql ya define tablas para:

Carritos (carts, cart_items)

Pedidos (orders, order_items)

Pagos (payments)

Envíos (shipments)

Estas tablas permitirán implementar en una fase siguiente:

Carrito de compra

Conversión de carrito a pedido

Registro de pagos

Seguimiento de envíos

## 9. Información del repositorio Git

Nombre del repositorio: raiceschiapanecas

URL del repositorio:
https://github.com/MarioGaPe-T/raiceschiapanecas.git

## 10. Archivos ignorados en Git

En el archivo .gitignore se excluyen al menos:

node_modules/

.env (si en un futuro se usa)

Archivos temporales como logs o cachés
# Proyecto Raíces Chiapanecas 🌱

Tienda en línea de productos regionales chiapanecos (café, miel, cacao, textiles y artesanías) que conecta productores locales con consumidores finales.

El proyecto promueve el comercio justo, la identidad cultural y la sostenibilidad, y cuenta con:

Tienda pública con filtrado por categorías y buscador.

Carrito de compras y conversión a pedido.

Perfil de cliente con dirección principal y seguimiento de pedidos.

Panel de administración para gestionar catálogos y pedidos.

## 1. Requisitos

- Node.js v18 o superior
- XAMPP / LAMPP con:
- MariaDB 10.4.32
- phpMyAdmin 5.2.1

* Probado en:
  - Ubuntu 24.04.2 LTS x86_64 con XAMPP (LAMPP) for Linux 8.2.12-0
  - Windows 11 25H2 (virtualizado) con XAMPP for Windows 8.2.12-0

## 2. Instalación de dependencias

* Desde la carpeta raíz del proyecto (donde está index.js):
  Si el proyecto se inicia desde cero, inicializar npm:
    - npm init -y

  * Instalar los módulos necesarios (backend):
    - $ npm install express mysql2 express-myconnection morgan bcryptjs express-session multer

  * (Opcional, para desarrollo con recarga automática):
    - npm install --save-dev nodemon

* Para iniciar la aplicación:
  * Modo normal:
    - node index.js
  * Con nodemon:
    - npx nodemon inde  x.js


  * El servidor escucha en:
    http://localhost:8080

## 3. Creación de la base de datos

* El script db/schema.sql crea automáticamente:

  - La base de datos raiceschiapanecas
  - El usuario raiceschiapanecas@localhost con contraseña hellofriend
  - Todas las tablas necesarias:
  - producers, categories, products, product_images, stock
  - customers, addresses
  - carts, cart_items
  - orders, order_items, payments, shipments

- Datos de ejemplo:
 - Categorías base: Café, Miel, Cacao, Textiles, Artesanías
 - Varios productores locales

* 2 productos por categoría con stock inicial
* Usuario *administrador* y usuario *cliente* de prueba

### 3.1 Ejecución en Linux (XAMPP / LAMPP)

Desde la carpeta raíz del proyecto ejecutar en la terminal:
- /opt/lampp/bin/mysql -u root -p < db/schema.sql
  (Se pedirá la contraseña de root si tiene).

### 3.2 Ejecución en Windows (XAMPP)

Desde la carpeta db del proyecto ejecutar en la terminal (CMD o PowerShell):
- "C:\xampp\mysql\bin\mysql.exe" --binary-mode=1 -u root -p < schema.sql

### 3.3 Verificación rápida en MySQL / phpMyAdmin

* Comprobar, desde MySQL o phpMyAdmin:

  SHOW DATABASES;
  USE raiceschiapanecas;
  SHOW TABLES;

- Debe aparecer la base de datos raiceschiapanecas con todas las tablas (customers, products, orders, carts, payments, shipments, etc.).

## 4. Usuarios de prueba

* En el schema.sql ya vienen dos usuarios creados en la tabla customers:

* *Administrador* 
  - Email: admin@c.com
  - Password: admin1
  - Rol: admin

* *Cliente* 
  - Email: cliente@c.com
  - Password: cliente1
  - Rol: customer

*Las contraseñas se guardan en la base de datos como password_hash usando bcrypt; los hashes ya están incluidos dentro del schema.sql.*

## 5. Conexión a la base de datos y middlewares

La configuración de la base de datos se encuentra en config/db.js y utiliza:

- mysql2
- express-myconnection

* En index.js se configuran los middlewares principales:

  - morgan → log de peticiones HTTP
  - express.json() y express.urlencoded() → parseo de JSON y formularios
  - express.static() → servir archivos estáticos (CSS, JS, imágenes) desde public
  - express-session → sesiones para login, roles y carrito asociado al usuario
  - express-myconnection → conexión a MySQL/MariaDB con el usuario de la BD
  - multer → subida de imágenes de productos al directorio public/uploads/products

* La conexión se realiza con los datos:
  * host: localhost
  * user: raiceschiapanecas
  * password: hellofriend
  * database: raiceschiapanecas
  * port: 3306

## 6. Estructura del proyecto

Estructura general (resumen lógico):

* index.js
  - Punto de entrada del servidor (Express). Configura middlewares, sesiones, conexión a BD y define:
  - Rutas de autenticación básicas.
  - Rutas públicas de la tienda (/, /cart, /me, /api/categories, /api/products, /api/cart/...).
  - Rutas de perfil (/profile, /api/profile/..., /api/my-orders/...).
  - Rutas de panel admin (/admin, /customers/panel, /products/panel, /admin/orders, etc.).

* Carpeta config/
  - db.js → Configuración del pool de conexión MySQL/MariaDB.

* Carpeta controllers/ (según organización del código):
  Lógica por recurso, por ejemplo:
  - authController.js
  - customerController.js
  - producerController.js
  - productController.js

(parte de la lógica de carrito/pedidos puede residir directamente en index.js o en controladores específicos).

* Carpeta models/
  Definición de modelos simples (mapeo entre filas de BD y objetos JS):
  - customer.js
  - producer.js
  - product.js
  - category.js

* Carpeta services/
  Capa de acceso a datos (consultas SQL encapsuladas):
  - customerService.js
  - producerService.js
  - productService.js
  - categoryService.js

  Servicios adicionales de carrito/pedidos/pagos si se usan.

* Carpeta routes/
  Definición de rutas Express:
  - auth.js → /register, /login, /logout
  - customers.js → CRUD de clientes en panel admin
  - producers.js → CRUD de productores
  - products.js → CRUD de productos
  - categories.js → CRUD de categorías

  Rutas específicas de carrito y pedidos (según la versión de código) agrupadas o definidas en index.js.

* Carpeta views/ (archivos HTML puros):
  - shop.html → Tienda pública (home)
  - login.html
  - register.html
  - profile.html → Perfil del usuario (datos, dirección y pedidos)
  - cart.html → Carrito del cliente
  - admin.html → Panel principal de administración
  - customers.html → Panel admin de clientes
  - producers.html → Panel admin de productores
  - products.html → Panel admin de productos
  - categories.html → Panel admin de categorías
  - admin_orders.html (o equivalente) → Panel admin de gestión de pedidos y envíos

* Carpeta public/:
  * css/styles.css → Hoja de estilos general (formularios, paneles, tienda y carrito)
  * uploads/products/ → Imágenes subidas de productos desde el panel admin

* Carpeta db/:
  - schema.sql → Script SQL con creación de BD, tablas, datos de ejemplo y usuarios de prueba.

## 7. Rutas principales de la aplicación

### 7.1 Ruta raíz – Tienda pública

GET /
Devuelve views/shop.html.

Este archivo muestra:

Header de tienda con logo, buscador, icono de carrito y botones de login o perfil (según si hay sesión).

Bloque tipo “hero” con texto de presentación del proyecto.

Barra de categorías para explorar productos por categoría.

Rejilla de productos activos.

Botones “Agregar al carrito”.

La tienda usa endpoints públicos (solo lectura):

GET /api/categories
Devuelve JSON con las categorías (id, name, slug).

GET /api/products
Devuelve JSON con los productos activos, incluyendo nombres de categoría y productor, precio y datos básicos.

El filtro por categoría y la búsqueda de texto se realizan en el frontend (JavaScript) usando estas APIs.

### 7.2 Autenticación y sesión

Manejada en las rutas de autenticación (archivo de rutas / controladores correspondientes).

GET /register
Devuelve el formulario de registro (register.html).

POST /register
Crea un nuevo cliente en la tabla customers:

Guarda full_name, email, phone (opcional) y password_hash (bcrypt).

Asigna rol por defecto customer.

GET /login
Devuelve el formulario de login (login.html).

POST /login
Verifica correo y contraseña. Si son correctos, guarda en sesión un objeto tipo:

{
  "id": 1,
  "full_name": "Nombre Apellido",
  "email": "user@c.com",
  "role": "admin|customer"
}


Si es admin → redirige a /admin.

Si es cliente → redirige a / (tienda).

POST /logout
Destruye la sesión (cierra sesión) y redirige a /login o / según la implementación.

GET /me
Devuelve información simple sobre la sesión en JSON:

Si no hay sesión: loggedIn = false

Si hay sesión: loggedIn = true y datos del usuario (id, full_name, email, role).

shop.html, cart.html y profile.html consultan /me para saber si deben mostrar “Iniciar sesión / Crear cuenta” o “Hola, Nombre · Perfil · Cerrar sesión”.

### 7.3 Perfil del usuario

GET /profile
Devuelve views/profile.html.
Solo accesible si el usuario ha iniciado sesión (admin o customer). Si no, redirige a /login.

APIs utilizadas por el perfil:

GET /api/profile
Devuelve la información de la tabla customers para el usuario actual (id, full_name, email, phone, role, created_at).

PUT /api/profile
Permite actualizar full_name, email y phone.
También actualiza la información en la sesión.

GET /api/profile/address
Devuelve la dirección principal de envío del usuario a partir de la tabla addresses.
Si no hay dirección, devuelve null.

POST/PUT /api/profile/address

Si se envía un id, actualiza una dirección existente.

Si no se envía id, crea una nueva dirección y la marca como is_default = 1.

Campos principales: street, city, state, postal_code, country, type (shipping/billing).

PUT /api/profile/password
Recibe la contraseña actual y la nueva:

Verifica que la contraseña actual coincide con el password_hash guardado.

Si es correcta, genera un nuevo hash y lo actualiza en la BD.

Todas las rutas /api/profile... requieren que el usuario esté logueado; si no, devuelven error 401.

#### 7.3.1 Mis pedidos desde el perfil

El perfil también muestra la sección “Mis pedidos”, alimentada por:

GET /api/my-orders
Devuelve la lista de pedidos del cliente autenticado, con campos como:

id, created_at, status, grand_total, items_count, shipment_status (si existe envío).

GET /api/my-orders/:id
Devuelve el detalle de un pedido específico, incluyendo:

Datos del pedido (orders)

Líneas de pedido (order_items)

Pago asociado (payments)

Envío (si existe) desde shipments

En la interfaz:

Al hacer clic en una fila de pedido, se despliega una fila de detalles debajo con productos, totales y acciones.

Para pedidos pendientes de pago se muestra un botón “PAGAR” (simulación de pago).

Para pedidos pending o paid, se muestra un botón de “Cancelar pedido” (según reglas de negocio).

Acciones desde el perfil:

POST /api/payments/:orderId/simulate
Simula el pago de un pedido:

Crea o actualiza el registro en payments con status = 'paid'.

Actualiza el status del pedido a paid.

POST /api/my-orders/:id/cancel
Marca el pedido como cancelled si aún está dentro de los estados permitidos (por ejemplo pending).

### 7.4 Panel de administración

Solo para usuarios con role = 'admin'.

En index.js se aplica un middleware tipo requireAdmin que revisa:

Que exista req.session.user

Que req.session.user.role === 'admin'

Si no está logueado, redirige a /login.
Si está logueado pero no es admin, devuelve 403 o redirige según la implementación.

Rutas de panel:

GET /admin
Devuelve views/admin.html, que muestra un menú con enlaces a:

Gestión de clientes

Gestión de productores

Gestión de categorías

Gestión de productos

Gestión de pedidos

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

GET /products → lista JSON de productos (con nombres de categoría y productor)

GET /products/meta → listas de categorías y productores para llenar <select> en el formulario

POST /products → crea un producto nuevo

PUT /products/:id → actualiza producto (si no se envía slug, se puede generar desde el nombre)

DELETE /products/:id → elimina producto

En el formulario de detalle se pueden subir imágenes que se guardan en product_images y en public/uploads/products/

#### 7.4.5 Gestión de pedidos y envíos (admin)

GET /admin/orders
Devuelve la vista de gestión de pedidos (HTML) donde el admin puede:

Ver listado de pedidos con cliente, total, estado de pedido y estado de envío.

Hacer clic en un pedido para ver detalle (productos, dirección, pago y envío).

Actualizar el estado del pedido y la información de envío.

APIs principales de admin:

GET /api/admin/orders
Devuelve la lista de pedidos con información resumida de:

Cliente, totales, estado de pedido (orders.status), estado de envío (si existe).

GET /api/admin/orders/:id
Devuelve el detalle de un pedido, incluyendo:

Datos de orders

order_items

customers

Direcciones asociadas (addresses)

Pagos (payments)

Envío (shipments)

PUT /api/admin/orders/:id/status (si está implementado)
Permite cambiar el status del pedido (pending, paid, shipped, delivered, cancelled, refunded).

PUT /api/admin/orders/:id/shipment
Crea o actualiza el registro en shipments para ese pedido, incluyendo:

carrier

tracking_code

status (por ejemplo: pending, in_transit, delivered, lost, returned)

Fechas de envío/entrega según reglas de negocio

En la interfaz:

Al hacer clic en una fila, la página se desplaza suavemente hacia el bloque de detalles del pedido.

El encabezado de detalle resalta con un fondo diferenciado para distinguirlo del resto de filas.


## 8. Carrito, pedidos, pagos y envíos

En esta versión del proyecto el flujo de compra está implementado de forma básica pero funcional.


### 8.1 Carrito de compras

Rutas principales:

GET /cart
Devuelve cart.html. Solo accesible si el usuario ha iniciado sesión como customer; si no, redirige a /login.

GET /api/cart
Devuelve el carrito actual del usuario (o uno temporal asociado a sesión), con:

Items: producto, cantidad, precio unitario, total por línea.

Totales de carrito: subtotal, shipping_cost, tax_total, grand_total.

POST /api/cart/add
Agrega un producto al carrito. Si el producto ya existe en el carrito, incrementa la cantidad.

PUT /api/cart/items/:id
Actualiza la cantidad de un ítem de carrito.

DELETE /api/cart/items/:id
Elimina un ítem del carrito.


### 8.2 Conversión de carrito a pedido (checkout)

POST /api/cart/checkout
Convierte el carrito actual en un pedido (orders + order_items) usando:

El cliente autenticado (customers).

La dirección principal (addresses) como shipping_addr_id y/o billing_addr_id.

Los totales calculados (subtotal, shipping_cost, tax_total, grand_total).

Este endpoint también crea un registro en payments con status = 'pending', listo para ser “pagado” mediante la simulación de pago desde el perfil.


### 8.3 Pagos

La tabla payments registra métodos (card, transfer, etc.), monto y estado del pago.

El endpoint POST /api/payments/:orderId/simulate marca el pago como paid y actualiza el pedido a paid.

Esto permite probar el flujo completo sin integrar una pasarela real (Stripe, PayPal, etc.).


### 8.4 Envíos

La tabla shipments almacena:

order_id

carrier

tracking_code

status (enum básico: pending, in_transit, delivered, lost, returned)

Fechas de envío/entrega si se utilizan.

El cliente puede ver el estado de envío de cada pedido desde el perfil.

El admin puede crear o actualizar la información de envío desde /admin/orders mediante la API /api/admin/orders/:id/shipment.


## 9. Información del repositorio Git

Nombre del repositorio: raiceschiapanecas

URL del repositorio:
https://github.com/MarioGaPe-T/raiceschiapanecas.git


## 10. Archivos ignorados en Git

En el archivo .gitignore se deben excluir al menos:

node_modules/

.env (si en un futuro se usa para credenciales o configuración)

Archivos temporales como logs o cachés:

npm-debug.log*

*.log

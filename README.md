# Proyecto Raíces Chiapanecas 

**Descripción:**  
Tienda en línea de productos regionales chiapanecos (café, miel, cacao, textiles y artesanías), que conecta productores locales con consumidores nacionales.  
El proyecto promueve el comercio justo, la identidad cultural y la sostenibilidad.

---

## Requisitos

- **Node.js** v18 o superior  
- **XAMPP / LAMPP** con:
  - MariaDB 10.4.32
  - phpMyAdmin 5.2.1

Probado en:

- Ubuntu 24.04.2 LTS x86_64 con **XAMPP (LAMPP) for Linux 8.2.12-0**
- Windows 11 25H2 (virtualizado) con **XAMPP for Windows 8.2.12-0**

---

## Instalación de dependencias

Desde la carpeta raíz del proyecto (donde está `app.js`):

1. (Opcional, si el proyecto se inicia desde cero) Inicializar npm:
npm init -y

2. Instalar los módulos necesarios:

npm install express mysql2 express-myconnection morgan bcryptjs express-session

(Opcional para desarrollo con recarga automática:)
npm install --save-dev nodemon

3. Para iniciar la aplicación:
node app.js
# o, si usas nodemon:
nodemon app.js
El servidor quedará escuchando en:

http://localhost:8080

## Creación de la base de datos
El script db/schema.sql crea automáticamente:

- La base de datos raiceschiapanecas
- El usuario raiceschiapanecas@localhost con contraseña hellofriend
- Todas las tablas necesarias (producers, categories, products, customers, orders, etc.)
- Datos de prueba mínimos (categorías, productores, productos y stock)

- En Linux (XAMPP/LAMPP)
Desde la carpeta raíz del proyecto:
/opt/lampp/bin/mysql -u root -p < db/schema.sql

- En Windows (XAMPP)
Desde la carpeta db del proyecto:
"C:\xampp\mysql\bin\mysql.exe" --binary-mode=1 -u root -p < schema.sql

## Verificación rápida
Entrar a MySQL / phpMyAdmin y ejecutar:
SHOW DATABASES;
USE raiceschiapanecas;
SHOW TABLES;

## Conexión a la base de datos y middlewares
En el archivo app.js se utilizan los middlewares morgan y express-myconnection para manejar:

* Registro de peticiones HTTP
* Conexión con la base de datos MySQL/MariaDB
* Manejo de sesiones para login y roles

Ejemplo (fragmento de app.js):

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const mysql = require('mysql2');
const myConnection = require('express-myconnection');
const session = require('express-session');

const app = express();

// Logger HTTP
app.use(morgan('dev'));

// Parseo de JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (CSS, JS, imágenes)
app.use(express.static(path.join(__dirname, 'public')));

// Sesiones
app.use(session({
  secret: 'raices-super-secreto-123',
  resave: false,
  saveUninitialized: false
}));

// Conexión a la base de datos con el usuario del proyecto
app.use(myConnection(mysql, {
  host: 'localhost',
  user: 'raiceschiapanecas',
  password: 'hellofriend',
  port: 3306,
  database: 'raiceschiapanecas'
}, 'pool'));

## Rutas principales de la aplicación
Página de inicio (simple):

GET /

Autenticación y usuarios (tabla customers):

GET /register → Formulario de registro

POST /register → Crea un nuevo cliente (password hasheada con bcrypt, rol por defecto customer)

GET /login → Formulario de login

POST /login → Verifica credenciales, guarda el usuario en sesión (req.session.user) incluyendo el campo role (admin/customer)

POST /logout → Cierra la sesión del usuario

Panel de administración de clientes (solo admin):

GET /customers/panel → Panel HTML para ver, actualizar y eliminar clientes

GET /customers → API JSON con lista de clientes

GET /customers/:id → Detalle de un cliente

PUT /customers/:id → Actualizar datos de un cliente (full_name, email, phone)

DELETE /customers/:id → Eliminar un cliente

El acceso a las rutas /customers/... está protegido en app.js mediante un middleware que valida:

que el usuario haya iniciado sesión, y

que req.session.user.role === 'admin'.

## Información del repositorio Git
Nombre del repositorio: raiceschiapanecas

URL del repositorio:
https://github.com/MarioGaPe-T/raiceschiapanecas.git

### Archivos que no se suben al repositorio
En el archivo .gitignore (en la raíz del proyecto) se deben excluir, como mínimo:

gitignore
node_modules/
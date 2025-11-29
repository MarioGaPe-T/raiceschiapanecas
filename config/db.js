// config/db.js
const mysql = require('mysql2');

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'raiceschiapanecas',
  password: 'hellofriend',
  port: 3306,
  database: 'raiceschiapanecas',
};

// Exportamos el driver y la config
module.exports = {
  mysql,
  dbConfig,
};


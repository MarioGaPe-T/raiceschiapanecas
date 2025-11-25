const express = require('express');
const path = require('path');
const morgan = require('morgan');
const mysql = require('mysql2');
const myConnection = require('express-myconnection');
const session = require('express-session');

const authRouter = require('./routes/auth');
const customersRouter = require('./routes/customers');

const app = express();

app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: 'raices-super-secreto-123',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(
  myConnection(
    mysql,
    {
      host: 'localhost',
      user: 'raiceschiapanecas',
      password: 'hellofriend',
      port: 3306,
      database: 'raiceschiapanecas',
    },
    'pool'
  )
);

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).send('Debes iniciar sesión');
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).send('Acceso solo para administradores');
  }

  next();
}

app.use('/', authRouter);

app.use('/customers', requireAdmin, customersRouter);

app.get('/', (req, res) => {
  res.send('Inicio Raíces Chiapanecas');
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

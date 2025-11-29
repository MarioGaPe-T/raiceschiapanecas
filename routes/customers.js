// routes/customers.js
const express = require('express');
const path = require('path');
const customerController = require('../controllers/customerController');

const router = express.Router();

// Panel HTML (antes de /:id para que no choque)
router.get('/panel', (req, res) => {
  const filePath = path.join(__dirname, '../views/customers.html');
  res.sendFile(filePath);
});

// API REST de clientes
router.get('/', customerController.listCustomers);
router.get('/:id', customerController.getCustomerById);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;

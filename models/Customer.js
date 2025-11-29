// models/Customer.js

class Customer {
  constructor({ id, full_name, email, phone, created_at, role }) {
    this.id = id;
    this.full_name = full_name;
    this.email = email;
    this.phone = phone;
    this.created_at = created_at;
    this.role = role;
  }

  static fromRow(row) {
    return new Customer({
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      created_at: row.created_at,
      role: row.role,
    });
  }
}

module.exports = Customer;

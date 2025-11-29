// models/producer.js

class Producer {
  constructor({
    id,
    name,
    description,
    contact_email,
    phone,
    region,
    active,
    created_at,
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.contact_email = contact_email;
    this.phone = phone;
    this.region = region;
    this.active = !!active; // lo convertimos a booleano
    this.created_at = created_at;
  }

  static fromRow(row) {
    return new Producer({
      id: row.id,
      name: row.name,
      description: row.description,
      contact_email: row.contact_email,
      phone: row.phone,
      region: row.region,
      active: row.active,
      created_at: row.created_at,
    });
  }
}

module.exports = Producer;

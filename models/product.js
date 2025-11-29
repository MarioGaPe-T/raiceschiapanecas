// models/product.js
class Product {
  constructor(
    id,
    category_id,
    producer_id,
    name,
    slug,
    sku,
    description,
    price,
    status,
    weight_grams,
    created_at,
    category_name,
    producer_name
  ) {
    this.id = id;
    this.category_id = category_id;
    this.producer_id = producer_id;
    this.name = name;
    this.slug = slug;
    this.sku = sku;
    this.description = description;
    this.price = price;
    this.status = status;
    this.weight_grams = weight_grams;
    this.created_at = created_at;
    this.category_name = category_name || null;
    this.producer_name = producer_name || null;
  }

  static fromRow(row) {
    return new Product(
      row.id,
      row.category_id,
      row.producer_id,
      row.name,
      row.slug,
      row.sku,
      row.description,
      row.price,
      row.status,
      row.weight_grams,
      row.created_at,
      row.category_name,
      row.producer_name
    );
  }
}

module.exports = Product;

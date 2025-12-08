// models/product.js

class Product {
  constructor(row) {
    this.id = row.id;
    this.category_id = row.category_id;
    this.producer_id = row.producer_id;
    this.name = row.name;
    this.slug = row.slug;
    this.sku = row.sku;
    this.description = row.description;
    this.price = row.price;
    this.status = row.status;
    this.weight_grams = row.weight_grams;
    this.created_at = row.created_at;

    // Campos derivados
    this.category_name = row.category_name || null;
    this.producer_name = row.producer_name || null;
    this.primary_image_url = row.primary_image_url || null;
    this.stock_quantity =
      row.stock_quantity !== undefined && row.stock_quantity !== null
        ? Number(row.stock_quantity)
        : null;
  }

  static fromRow(row) {
    return new Product(row);
  }
}

module.exports = Product;

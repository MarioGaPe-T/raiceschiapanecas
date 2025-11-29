// models/category.js

class Category {
  constructor({ id, parent_id, name, slug, created_at, parent_name = null }) {
    this.id = id;
    this.parent_id = parent_id;
    this.name = name;
    this.slug = slug;
    this.created_at = created_at;
    this.parent_name = parent_name;
  }

  static fromRow(row) {
    return new Category({
      id: row.id,
      parent_id: row.parent_id,
      name: row.name,
      slug: row.slug,
      created_at: row.created_at,
      parent_name: row.parent_name || null,
    });
  }
}

module.exports = Category;

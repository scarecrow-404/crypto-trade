import Database from "../config/database.js";
import { v4 as uuidv4 } from "uuid";
class BaseModel {
  constructor(data = {}) {
    Object.assign(this, data);
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  static get tableName() {
    throw new Error("tableName must be defined in subclass");
  }

  static get fillable() {
    return [];
  }

  static async find(id) {
    const result = await Database.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows.length > 0 ? new this(result.rows[0]) : null;
  }

  static async findBy(field, value) {
    const result = await Database.query(
      `SELECT * FROM ${this.tableName} WHERE ${field} = $1`,
      [value]
    );
    return result.rows.length > 0 ? new this(result.rows[0]) : null;
  }

  static async all() {
    const result = await Database.query(`SELECT * FROM ${this.tableName}`);
    return result.rows.map((row) => new this(row));
  }

  static async where(conditions) {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(" AND ");

    const result = await Database.query(
      `SELECT * FROM ${this.tableName} WHERE ${whereClause}`,
      values
    );

    return result.rows.map((row) => new this(row));
  }

  async save() {
    const fillableFields = this.constructor.fillable;
    const fields = fillableFields.filter((field) => this[field] !== undefined);

    if (this.created_at === undefined) {
      this.created_at = new Date();
    }

    const values = fields.map((field) => this[field]);
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(", ");
    const fieldsList = fields.join(", ");

    const result = await Database.query(
      `INSERT INTO ${
        this.constructor.tableName
      } (id, ${fieldsList}, created_at) 
       VALUES ($${values.length + 1}, ${placeholders}, $${values.length + 2}) 
       RETURNING *`,
      [...values, this.id, this.created_at]
    );

    Object.assign(this, result.rows[0]);
    return this;
  }

  async update(data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(", ");

    const result = await Database.query(
      `UPDATE ${this.constructor.tableName} SET ${setClause} WHERE id = $${
        values.length + 1
      } RETURNING *`,
      [...values, this.id]
    );

    if (result.rows.length > 0) {
      Object.assign(this, result.rows[0]);
    }
    return this;
  }

  async delete() {
    await Database.query(
      `DELETE FROM ${this.constructor.tableName} WHERE id = $1`,
      [this.id]
    );
    return true;
  }

  async hasMany(relatedModel, foreignKey, localKey = "id") {
    const result = await Database.query(
      `SELECT * FROM ${relatedModel.tableName} WHERE ${foreignKey} = $1`,
      [this[localKey]]
    );
    return result.rows.map((row) => new relatedModel(row));
  }

  async belongsTo(relatedModel, foreignKey, ownerKey = "id") {
    const result = await Database.query(
      `SELECT * FROM ${relatedModel.tableName} WHERE ${ownerKey} = $1`,
      [this[foreignKey]]
    );
    return result.rows.length > 0 ? new relatedModel(result.rows[0]) : null;
  }

  async belongsToMany(relatedModel, pivotTable, foreignKey, relatedKey) {
    const result = await Database.query(
      `SELECT r.* FROM ${relatedModel.tableName} r 
       JOIN ${pivotTable} p ON r.id = p.${relatedKey}
       WHERE p.${foreignKey} = $1`,
      [this.id]
    );
    return result.rows.map((row) => new relatedModel(row));
  }
}

export default BaseModel;

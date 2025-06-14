class Transaction extends BaseModel {
  static get tableName() {
    return "transactions";
  }

  static get fillable() {
    return ["user_id", "currency_id", "type", "amount", "status"];
  }

  async user() {
    const User = require("./User");
    return await this.belongsTo(User, "user_id");
  }

  async currency() {
    const Currency = require("./Currency");
    return await this.belongsTo(Currency, "currency_id");
  }
}
module.exports = Transaction;

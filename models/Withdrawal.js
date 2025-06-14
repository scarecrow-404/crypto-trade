import BaseModel from "./BaseModel.js";

class Withdrawal extends BaseModel {
  static get tableName() {
    return "withdrawals";
  }

  static get fillable() {
    return ["user_id", "currency_id", "amount", "status"];
  }

  async user() {
    const User = require("./User");
    return await this.belongsTo(User, "user_id");
  }

  async currency() {
    const Currency = require("./Currency");
    return await this.belongsTo(Currency, "currency_id");
  }

  async complete() {
    await this.update({ status: "completed" });

    await Transaction.create({
      user_id: this.user_id,
      currency_id: this.currency_id,
      type: "withdrawal",
      amount: this.amount,
      status: "completed",
    });
  }
}

export default Withdrawal;

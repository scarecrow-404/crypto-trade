import BaseModel from "./BaseModel.js";
class Deposit extends BaseModel {
  static get tableName() {
    return "deposits";
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

  async confirm() {
    await this.update({ status: "confirmed" });

    const user = await this.user();
    const wallet = await user.getWalletByCurrency(this.currency_id);
    if (wallet) {
      await wallet.addBalance(this.amount);
    }

    await Transaction.create({
      user_id: this.user_id,
      currency_id: this.currency_id,
      type: "deposit",
      amount: this.amount,
      status: "completed",
    });
  }
}

export default Deposit;

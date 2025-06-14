import BaseModel from "./BaseModel.js";
class Transfer extends BaseModel {
  static get tableName() {
    return "transfers";
  }

  static get fillable() {
    return ["from_user_id", "to_user_id", "currency_id", "amount", "status"];
  }

  async fromUser() {
    const User = require("./User");
    return await this.belongsTo(User, "from_user_id");
  }

  async toUser() {
    const User = require("./User");
    return await this.belongsTo(User, "to_user_id");
  }

  async currency() {
    const Currency = require("./Currency");
    return await this.belongsTo(Currency, "currency_id");
  }

  async complete() {
    const Database = require("../config/database");

    await Database.transaction(async (client) => {
      // Update transfer status
      await this.update({ status: "completed" });

      // Update sender's wallet
      const fromUser = await this.fromUser();
      const fromWallet = await fromUser.getWalletByCurrency(this.currency_id);
      if (fromWallet) {
        await fromWallet.subtractBalance(this.amount);
      }

      // Update receiver's wallet
      const toUser = await this.toUser();
      const toWallet = await toUser.getWalletByCurrency(this.currency_id);
      if (toWallet) {
        await toWallet.addBalance(this.amount);
      }
    });
  }
}
export default Transfer;

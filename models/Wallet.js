import BaseModel from "./BaseModel.js";
export class Wallet extends BaseModel {
  static get tableName() {
    return "wallets";
  }

  static get fillable() {
    return ["user_id", "currency_id", "balance", "locked_balance"];
  }

  async user() {
    const User = require("./User.js");
    return await this.belongsTo(User, "user_id");
  }

  async currency() {
    const Currency = require("./Currency");
    return await this.belongsTo(Currency, "currency_id");
  }

  getAvailableBalance() {
    return parseFloat(this.balance || 0) - parseFloat(this.locked_balance || 0);
  }

  async lockBalance(amount) {
    const currentLocked = parseFloat(this.locked_balance || 0);
    await this.update({
      locked_balance: currentLocked + parseFloat(amount),
    });
  }

  async unlockBalance(amount) {
    const currentLocked = parseFloat(this.locked_balance || 0);
    await this.update({
      locked_balance: Math.max(0, currentLocked - parseFloat(amount)),
    });
  }

  async addBalance(amount) {
    const currentBalance = parseFloat(this.balance || 0);
    await this.update({
      balance: currentBalance + parseFloat(amount),
    });
  }

  async subtractBalance(amount) {
    const currentBalance = parseFloat(this.balance || 0);
    if (currentBalance < parseFloat(amount)) {
      throw new Error("Insufficient balance");
    }
    await this.update({
      balance: currentBalance - parseFloat(amount),
    });
  }
}
export class Order extends BaseModel {
  static get tableName() {
    return "orders";
  }

  static get fillable() {
    return [
      "user_id",
      "base_currency_id",
      "quote_currency_id",
      "type",
      "status",
      "quantity",
      "price",
    ];
  }

  async user() {
    const User = require("./User.js");
    return await this.belongsTo(User, "user_id");
  }

  async baseCurrency() {
    const Currency = require("./Currency");
    return await this.belongsTo(Currency, "base_currency_id");
  }

  async quoteCurrency() {
    const Currency = require("./Currency");
    return await this.belongsTo(Currency, "quote_currency_id");
  }

  async buyTrades() {
    const Trade = require("./Trade");
    return await this.hasMany(Trade, "buy_order_id");
  }

  async sellTrades() {
    const Trade = require("./Trade");
    return await this.hasMany(Trade, "sell_order_id");
  }

  getTotalValue() {
    return parseFloat(this.quantity) * parseFloat(this.price);
  }

  isActive() {
    return this.status === "pending";
  }

  static async getPendingOrders(baseCurrencyId, quoteCurrencyId, type = null) {
    let conditions = {
      base_currency_id: baseCurrencyId,
      quote_currency_id: quoteCurrencyId,
      status: "pending",
    };

    if (type) {
      conditions.type = type;
    }

    return await this.where(conditions);
  }

  async cancel() {
    if (this.status !== "pending") {
      throw new Error("Can only cancel pending orders");
    }

    await this.update({ status: "cancelled" });

    const user = await this.user();
    const wallet = await user.getWalletByCurrency(
      this.type === "buy" ? this.quote_currency_id : this.base_currency_id
    );

    if (wallet) {
      const lockedAmount =
        this.type === "buy" ? this.getTotalValue() : parseFloat(this.quantity);
      await wallet.unlockBalance(lockedAmount);
    }
  }
}

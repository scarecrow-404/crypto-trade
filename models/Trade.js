import BaseModel from "./BaseModel.js";
class Trade extends BaseModel {
  static get tableName() {
    return "trades";
  }

  static get fillable() {
    return [
      "buy_order_id",
      "sell_order_id",
      "buyer_id",
      "seller_id",
      "base_currency_id",
      "quote_currency_id",
      "quantity",
      "price",
    ];
  }

  async buyOrder() {
    const { Order } = require("./Wallet");
    return await this.belongsTo(Order, "buy_order_id");
  }

  async sellOrder() {
    const { Order } = require("./Wallet");
    return await this.belongsTo(Order, "sell_order_id");
  }

  async buyer() {
    const User = require("./User");
    return await this.belongsTo(User, "buyer_id");
  }

  async seller() {
    const User = require("./User");
    return await this.belongsTo(User, "seller_id");
  }

  async baseCurrency() {
    const Currency = require("./Currency");
    return await this.belongsTo(Currency, "base_currency_id");
  }

  async quoteCurrency() {
    const Currency = require("./Currency");
    return await this.belongsTo(Currency, "quote_currency_id");
  }

  getTotalValue() {
    return parseFloat(this.quantity) * parseFloat(this.price);
  }
}

export default Trade;

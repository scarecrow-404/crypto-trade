import BaseModel from "./BaseModel.js";
class Currency extends BaseModel {
  static get tableName() {
    return "currencies";
  }

  static get fillable() {
    return ["symbol", "name", "type", "decimal_places", "is_active"];
  }

  async wallets() {
    const Wallet = require("./Wallet");
    return await this.hasMany(Wallet, "currency_id");
  }

  async transactions() {
    const Transaction = require("./Transaction");
    return await this.hasMany(Transaction, "currency_id");
  }

  async deposits() {
    const Deposit = require("./Deposit");
    return await this.hasMany(Deposit, "currency_id");
  }

  async withdrawals() {
    const Withdrawal = require("./Withdrawal");
    return await this.hasMany(Withdrawal, "currency_id");
  }

  async transfers() {
    const Transfer = require("./Transfer");
    return await this.hasMany(Transfer, "currency_id");
  }

  async baseOrders() {
    const Order = require("./Order");
    return await this.hasMany(Order, "base_currency_id");
  }

  async quoteOrders() {
    const Order = require("./Order");
    return await this.hasMany(Order, "quote_currency_id");
  }

  async baseTrades() {
    const Trade = require("./Trade");
    return await this.hasMany(Trade, "base_currency_id");
  }

  async quoteTrades() {
    const Trade = require("./Trade");
    return await this.hasMany(Trade, "quote_currency_id");
  }

  async baseMarketData() {
    const MarketData = require("./MarketData");
    return await this.hasMany(MarketData, "base_currency_id");
  }

  async quoteMarketData() {
    const MarketData = require("./MarketData");
    return await this.hasMany(MarketData, "quote_currency_id");
  }

  static async getActive() {
    return await this.where({ is_active: true });
  }

  static async getBySymbol(symbol) {
    return await this.findBy("symbol", symbol);
  }

  static async getCrypto() {
    return await this.where({ type: "crypto", is_active: true });
  }

  static async getFiat() {
    return await this.where({ type: "fiat", is_active: true });
  }

  formatAmount(amount) {
    return parseFloat(amount).toFixed(this.decimal_places);
  }

  async getTradingPairs() {
    const Database = require("../config/database.js");
    const result = await Database.query(
      `
      SELECT DISTINCT 
        base.symbol as base_symbol,
        quote.symbol as quote_symbol,
        base.id as base_id,
        quote.id as quote_id
      FROM market_data md
      JOIN currencies base ON md.base_currency_id = base.id
      JOIN currencies quote ON md.quote_currency_id = quote.id
      WHERE (base.id = $1 OR quote.id = $1)
        AND base.is_active = true 
        AND quote.is_active = true
    `,
      [this.id]
    );

    return result.rows;
  }
}

export default Currency;

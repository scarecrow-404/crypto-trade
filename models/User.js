import BaseModel from "./BaseModel.js";
import bcrypt from "bcrypt";
class User extends BaseModel {
  static get tableName() {
    return "users";
  }

  static get fillable() {
    return [
      "email",
      "password_hash",
      "first_name",
      "last_name",
      "kyc_status",
      "is_active",
    ];
  }

  static async create(userData) {
    if (userData.password) {
      userData.password_hash = await bcrypt.hash(userData.password, 10);
      delete userData.password;
    }

    const user = new this(userData);
    return await user.save();
  }

  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password_hash);
  }

  async wallets() {
    const Wallet = require("./models/Wallet");
    return await this.hasMany(Wallet, "user_id");
  }

  async orders() {
    const Order = require("./Order");
    return await this.hasMany(Order, "user_id");
  }

  async transactions() {
    const Transaction = require("./Transaction");
    return await this.hasMany(Transaction, "user_id");
  }

  async deposits() {
    const Deposit = require("./Deposit");
    return await this.hasMany(Deposit, "user_id");
  }

  async withdrawals() {
    const Withdrawal = require("./Withdrawal");
    return await this.hasMany(Withdrawal, "user_id");
  }

  async buyTrades() {
    const Trade = require("./Trade");
    return await this.hasMany(Trade, "buyer_id");
  }

  async sellTrades() {
    const Trade = require("./Trade");
    return await this.hasMany(Trade, "seller_id");
  }

  async sentTransfers() {
    const Transfer = require("./Transfer");
    return await this.hasMany(Transfer, "from_user_id");
  }

  async receivedTransfers() {
    const Transfer = require("./Transfer");
    return await this.hasMany(Transfer, "to_user_id");
  }

  async getWalletByCurrency(currencyId) {
    const wallets = await this.wallets();
    return wallets.find((wallet) => wallet.currency_id === currencyId);
  }

  async getAvailableBalance(currencyId) {
    const wallet = await this.getWalletByCurrency(currencyId);
    if (!wallet) return 0;
    return parseFloat(wallet.balance) - parseFloat(wallet.locked_balance || 0);
  }

  canTrade() {
    return this.kyc_status === "verified" && this.is_active;
  }

  toJSON() {
    const { password_hash, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

export default User;

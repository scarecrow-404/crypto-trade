import User from "../models/User.js";
import jwt from "jsonwebtoken";
class UserController {
  static async register(req, res) {
    try {
      const { email, password, first_name, last_name } = req.body;

      const existingUser = await User.findBy("email", email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      const user = await User.create({
        email,
        password,
        first_name,
        last_name,
        kyc_status: "pending",
        is_active: true,
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: user.toJSON(),
          token,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error registering user",
        error: error.message,
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findBy("email", email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: "Account is deactivated",
        });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: user.toJSON(),
          token,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error logging in",
        error: error.message,
      });
    }
  }

  static async getProfile(req, res) {
    try {
      const user = await User.find(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: user.toJSON(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching profile",
        error: error.message,
      });
    }
  }

  static async getWallets(req, res) {
    try {
      const user = await User.find(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const wallets = await user.wallets();

      const walletsWithCurrency = await Promise.all(
        wallets.map(async (wallet) => {
          const currency = await wallet.currency();
          return {
            ...wallet,
            currency,
            available_balance: wallet.getAvailableBalance(),
          };
        })
      );

      res.json({
        success: true,
        data: walletsWithCurrency,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching wallets",
        error: error.message,
      });
    }
  }

  static async getOrders(req, res) {
    try {
      const user = await User.find(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const orders = await user.orders();

      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          const baseCurrency = await order.baseCurrency();
          const quoteCurrency = await order.quoteCurrency();
          return {
            ...order,
            base_currency: baseCurrency,
            quote_currency: quoteCurrency,
            total_value: order.getTotalValue(),
          };
        })
      );

      res.json({
        success: true,
        data: ordersWithDetails,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching orders",
        error: error.message,
      });
    }
  }

  static async getTransactions(req, res) {
    try {
      const user = await User.find(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const transactions = await user.transactions();

      const transactionsWithCurrency = await Promise.all(
        transactions.map(async (transaction) => {
          const currency = await transaction.currency();
          return {
            ...transaction,
            currency,
          };
        })
      );

      res.json({
        success: true,
        data: transactionsWithCurrency,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching transactions",
        error: error.message,
      });
    }
  }

  static async updateKycStatus(req, res) {
    try {
      const { userId } = req.params;
      const { kyc_status } = req.body;

      const user = await User.find(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      await user.update({ kyc_status });

      res.json({
        success: true,
        message: "KYC status updated successfully",
        data: user.toJSON(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating KYC status",
        error: error.message,
      });
    }
  }
}

export default UserController;

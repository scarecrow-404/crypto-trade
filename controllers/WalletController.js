import { Wallet } from "../models/Wallet.js";
import User from "../models/User.js";
import Currency from "../models/Currency.js";
import Deposit from "../models/Deposit.js";
import Withdrawal from "../models/Withdrawal.js";
import Transfer from "../models/Transfer.js";

class WalletController {
  static async createDeposit(req, res) {
    try {
      const { currency_id, amount } = req.body;

      const user = await User.find(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const currency = await Currency.find(currency_id);
      if (!currency || !currency.is_active) {
        return res.status(400).json({
          success: false,
          message: "Invalid or inactive currency",
        });
      }

      const deposit = await Deposit.create({
        user_id: user.id,
        currency_id,
        amount,
        status: "pending",
      });

      res.status(201).json({
        success: true,
        message: "Deposit request created successfully",
        data: deposit,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating deposit",
        error: error.message,
      });
    }
  }

  static async createWithdrawal(req, res) {
    try {
      const { currency_id, amount } = req.body;

      const user = await User.find(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (!user.canTrade()) {
        return res.status(403).json({
          success: false,
          message: "KYC verification required for withdrawals",
        });
      }

      const currency = await Currency.find(currency_id);
      if (!currency || !currency.is_active) {
        return res.status(400).json({
          success: false,
          message: "Invalid or inactive currency",
        });
      }

      const availableBalance = await user.getAvailableBalance(currency_id);
      if (availableBalance < parseFloat(amount)) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
        });
      }

      const withdrawal = await Withdrawal.create({
        user_id: user.id,
        currency_id,
        amount,
        status: "pending",
      });

      const wallet = await user.getWalletByCurrency(currency_id);
      if (wallet) {
        await wallet.subtractBalance(amount);
      }

      res.status(201).json({
        success: true,
        message: "Withdrawal request created successfully",
        data: withdrawal,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating withdrawal",
        error: error.message,
      });
    }
  }

  static async createTransfer(req, res) {
    try {
      const { to_user_email, currency_id, amount } = req.body;

      const fromUser = await User.find(req.userId);
      if (!fromUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const toUser = await User.findBy("email", to_user_email);
      if (!toUser) {
        return res.status(404).json({
          success: false,
          message: "Recipient user not found",
        });
      }

      if (fromUser.id === toUser.id) {
        return res.status(400).json({
          success: false,
          message: "Cannot transfer to yourself",
        });
      }

      const currency = await Currency.find(currency_id);
      if (!currency || !currency.is_active) {
        return res.status(400).json({
          success: false,
          message: "Invalid or inactive currency",
        });
      }

      const availableBalance = await fromUser.getAvailableBalance(currency_id);
      if (availableBalance < parseFloat(amount)) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
        });
      }

      const transfer = await Transfer.create({
        from_user_id: fromUser.id,
        to_user_id: toUser.id,
        currency_id,
        amount,
        status: "pending",
      });

      await transfer.complete();

      res.status(201).json({
        success: true,
        message: "Transfer completed successfully",
        data: transfer,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating transfer",
        error: error.message,
      });
    }
  }

  static async getDeposits(req, res) {
    try {
      const user = await User.find(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const deposits = await user.deposits();

      const depositsWithCurrency = await Promise.all(
        deposits.map(async (deposit) => {
          const currency = await deposit.currency();
          return {
            ...deposit,
            currency,
          };
        })
      );

      res.json({
        success: true,
        data: depositsWithCurrency,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching deposits",
        error: error.message,
      });
    }
  }

  static async getWithdrawals(req, res) {
    try {
      const user = await User.find(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const withdrawals = await user.withdrawals();

      const withdrawalsWithCurrency = await Promise.all(
        withdrawals.map(async (withdrawal) => {
          const currency = await withdrawal.currency();
          return {
            ...withdrawal,
            currency,
          };
        })
      );

      res.json({
        success: true,
        data: withdrawalsWithCurrency,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching withdrawals",
        error: error.message,
      });
    }
  }

  static async getTransfers(req, res) {
    try {
      const user = await User.find(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const sentTransfers = await user.sentTransfers();
      const receivedTransfers = await user.receivedTransfers();

      const allTransfers = [...sentTransfers, ...receivedTransfers];

      const transfersWithDetails = await Promise.all(
        allTransfers.map(async (transfer) => {
          const currency = await transfer.currency();
          const fromUser = await transfer.fromUser();
          const toUser = await transfer.toUser();

          return {
            ...transfer,
            currency,
            from_user: {
              id: fromUser.id,
              email: fromUser.email,
              first_name: fromUser.first_name,
              last_name: fromUser.last_name,
            },
            to_user: {
              id: toUser.id,
              email: toUser.email,
              first_name: toUser.first_name,
              last_name: toUser.last_name,
            },
            type: transfer.from_user_id === user.id ? "sent" : "received",
          };
        })
      );

      transfersWithDetails.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      res.json({
        success: true,
        data: transfersWithDetails,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching transfers",
        error: error.message,
      });
    }
  }

  static async confirmDeposit(req, res) {
    try {
      const { depositId } = req.params;

      const deposit = await Deposit.find(depositId);
      if (!deposit) {
        return res.status(404).json({
          success: false,
          message: "Deposit not found",
        });
      }

      if (deposit.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Deposit already processed",
        });
      }

      await deposit.confirm();

      res.json({
        success: true,
        message: "Deposit confirmed successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error confirming deposit",
        error: error.message,
      });
    }
  }

  static async completeWithdrawal(req, res) {
    try {
      const { withdrawalId } = req.params;

      const withdrawal = await Withdrawal.find(withdrawalId);
      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          message: "Withdrawal not found",
        });
      }

      if (withdrawal.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Withdrawal already processed",
        });
      }

      await withdrawal.complete();

      res.json({
        success: true,
        message: "Withdrawal completed successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error completing withdrawal",
        error: error.message,
      });
    }
  }
}

export default WalletController;

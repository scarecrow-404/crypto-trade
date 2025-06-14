import { Order } from "../models/Wallet.js";
import User from "../models/User.js";
import Trade from "../models/Trade.js";
import Currency from "../models/Currency.js";
import Database from "../config/database.js";

class OrderController {
  /**
   * @swagger
   * /orders:
   *   post:
   *     summary: Create a new trade order
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - base_currency_id
   *               - quote_currency_id
   *               - type
   *               - quantity
   *               - price
   *             properties:
   *               base_currency_id:
   *                 type: string
   *                 example: "BTC"
   *               quote_currency_id:
   *                 type: string
   *                 example: "USDT"
   *               type:
   *                 type: string
   *                 enum: [buy, sell]
   *               quantity:
   *                 type: number
   *                 example: 1.5
   *               price:
   *                 type: number
   *                 example: 25000
   *     responses:
   *       201:
   *         description: Order created successfully
   *       400:
   *         description: Invalid input or insufficient balance
   *       403:
   *         description: Unauthorized to trade
   *       500:
   *         description: Internal server error
   */

  static async createOrder(req, res) {
    try {
      const { base_currency_id, quote_currency_id, type, quantity, price } =
        req.body;

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
          message: "User not authorized to trade. KYC verification required.",
        });
      }

      const baseCurrency = await Currency.find(base_currency_id);
      const quoteCurrency = await Currency.find(quote_currency_id);

      if (!baseCurrency || !quoteCurrency) {
        return res.status(400).json({
          success: false,
          message: "Invalid currency pair",
        });
      }

      const totalValue = parseFloat(quantity) * parseFloat(price);
      const requiredCurrencyId =
        type === "buy" ? quote_currency_id : base_currency_id;
      const requiredAmount = type === "buy" ? totalValue : parseFloat(quantity);

      const availableBalance = await user.getAvailableBalance(
        requiredCurrencyId
      );
      if (availableBalance < requiredAmount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
        });
      }

      const order = await Database.transaction(async (client) => {
        const newOrder = await Order.create({
          user_id: user.id,
          base_currency_id,
          quote_currency_id,
          type,
          quantity,
          price,
          status: "pending",
        });

        const wallet = await user.getWalletByCurrency(requiredCurrencyId);
        if (wallet) {
          await wallet.lockBalance(requiredAmount);
        }

        return newOrder;
      });

      await OrderController.matchOrders(base_currency_id, quote_currency_id);

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: order,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating order",
        error: error.message,
      });
    }
  }

  static async getOrderBook(req, res) {
    try {
      const { base_currency_id, quote_currency_id } = req.params;

      const buyOrders = await Database.query(
        `
        SELECT o.*, u.first_name, u.last_name 
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.base_currency_id = $1 
          AND o.quote_currency_id = $2 
          AND o.type = 'buy' 
          AND o.status = 'pending'
        ORDER BY o.price DESC, o.created_at ASC
      `,
        [base_currency_id, quote_currency_id]
      );

      const sellOrders = await Database.query(
        `
        SELECT o.*, u.first_name, u.last_name 
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.base_currency_id = $1 
          AND o.quote_currency_id = $2 
          AND o.type = 'sell' 
          AND o.status = 'pending'
        ORDER BY o.price ASC, o.created_at ASC
      `,
        [base_currency_id, quote_currency_id]
      );

      res.json({
        success: true,
        data: {
          buy_orders: buyOrders.rows,
          sell_orders: sellOrders.rows,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching order book",
        error: error.message,
      });
    }
  }

  static async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;

      const order = await Order.find(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (order.user_id !== req.userId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to cancel this order",
        });
      }

      await order.cancel();

      res.json({
        success: true,
        message: "Order cancelled successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error cancelling order",
        error: error.message,
      });
    }
  }

  static async matchOrders(baseCurrencyId, quoteCurrencyId) {
    try {
      const buyOrders = await Order.getPendingOrders(
        baseCurrencyId,
        quoteCurrencyId,
        "buy"
      );
      const bestBuy = buyOrders.sort(
        (a, b) => parseFloat(b.price) - parseFloat(a.price)
      )[0];

      const sellOrders = await Order.getPendingOrders(
        baseCurrencyId,
        quoteCurrencyId,
        "sell"
      );
      const bestSell = sellOrders.sort(
        (a, b) => parseFloat(a.price) - parseFloat(b.price)
      )[0];

      if (!bestBuy || !bestSell) return;

      if (parseFloat(bestBuy.price) >= parseFloat(bestSell.price)) {
        const tradePrice = parseFloat(bestSell.price); // Seller's price
        const tradeQuantity = Math.min(
          parseFloat(bestBuy.quantity),
          parseFloat(bestSell.quantity)
        );

        await Database.transaction(async (client) => {
          const trade = await Trade.create({
            buy_order_id: bestBuy.id,
            sell_order_id: bestSell.id,
            buyer_id: bestBuy.user_id,
            seller_id: bestSell.user_id,
            base_currency_id: baseCurrencyId,
            quote_currency_id: quoteCurrencyId,
            quantity: tradeQuantity,
            price: tradePrice,
          });

          const remainingBuyQuantity =
            parseFloat(bestBuy.quantity) - tradeQuantity;
          const remainingSellQuantity =
            parseFloat(bestSell.quantity) - tradeQuantity;

          if (remainingBuyQuantity <= 0) {
            await bestBuy.update({ status: "filled", quantity: 0 });
          } else {
            await bestBuy.update({ quantity: remainingBuyQuantity });
          }

          if (remainingSellQuantity <= 0) {
            await bestSell.update({ status: "filled", quantity: 0 });
          } else {
            await bestSell.update({ quantity: remainingSellQuantity });
          }

          const buyer = await User.find(bestBuy.user_id);
          const seller = await User.find(bestSell.user_id);

          const buyerBaseWallet = await buyer.getWalletByCurrency(
            baseCurrencyId
          );
          const buyerQuoteWallet = await buyer.getWalletByCurrency(
            quoteCurrencyId
          );

          if (buyerBaseWallet) await buyerBaseWallet.addBalance(tradeQuantity);
          if (buyerQuoteWallet) {
            const totalCost = tradeQuantity * tradePrice;
            await buyerQuoteWallet.unlockBalance(totalCost);
            await buyerQuoteWallet.subtractBalance(totalCost);
          }

          const sellerBaseWallet = await seller.getWalletByCurrency(
            baseCurrencyId
          );
          const sellerQuoteWallet = await seller.getWalletByCurrency(
            quoteCurrencyId
          );

          if (sellerBaseWallet) {
            await sellerBaseWallet.unlockBalance(tradeQuantity);
            await sellerBaseWallet.subtractBalance(tradeQuantity);
          }
          if (sellerQuoteWallet) {
            const totalReceived = tradeQuantity * tradePrice;
            await sellerQuoteWallet.addBalance(totalReceived);
          }
        });

        if (
          parseFloat(bestBuy.quantity) > 0 ||
          parseFloat(bestSell.quantity) > 0
        ) {
          await OrderController.matchOrders(baseCurrencyId, quoteCurrencyId);
        }
      }
    } catch (error) {
      console.error("Order matching error:", error);
    }
  }

  static async getRecentTrades(req, res) {
    try {
      const { base_currency_id, quote_currency_id } = req.params;
      const limit = req.query.limit || 50;

      const result = await Database.query(
        `
        SELECT t.*, 
               bc.symbol as base_symbol,
               qc.symbol as quote_symbol
        FROM trades t
        JOIN currencies bc ON t.base_currency_id = bc.id
        JOIN currencies qc ON t.quote_currency_id = qc.id
        WHERE t.base_currency_id = $1 AND t.quote_currency_id = $2
        ORDER BY t.created_at DESC
        LIMIT $3
      `,
        [base_currency_id, quote_currency_id, limit]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching recent trades",
        error: error.message,
      });
    }
  }
}

export default OrderController;

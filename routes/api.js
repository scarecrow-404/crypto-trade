import express from "express";
import UserController from "../controllers/UserController.js";
import OrderController from "../controllers/OrderController.js";
import WalletController from "../controllers/WalletController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/auth/register", UserController.register);
router.post("/auth/login", UserController.login);

router.get("/user/profile", authMiddleware, UserController.getProfile);
router.get("/user/wallets", authMiddleware, UserController.getWallets);
router.get("/user/orders", authMiddleware, UserController.getOrders);
router.get(
  "/user/transactions",
  authMiddleware,
  UserController.getTransactions
);

router.post("/orders", authMiddleware, OrderController.createOrder);
/**
 * @swagger
 * /orders/{base_currency_id}/{quote_currency_id}/book:
 *   get:
 *     summary: Get order book
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: base_currency_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: quote_currency_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of buy/sell orders
 */
router.get(
  "/orders/:base_currency_id/:quote_currency_id/book",
  OrderController.getOrderBook
);
router.get(
  "/orders/:base_currency_id/:quote_currency_id/trades",
  OrderController.getRecentTrades
);
router.delete("/orders/:orderId", authMiddleware, OrderController.cancelOrder);

router.post("/wallet/deposit", authMiddleware, WalletController.createDeposit);
router.post(
  "/wallet/withdraw",
  authMiddleware,
  WalletController.createWithdrawal
);
router.post(
  "/wallet/transfer",
  authMiddleware,
  WalletController.createTransfer
);
router.get("/wallet/deposits", authMiddleware, WalletController.getDeposits);
router.get(
  "/wallet/withdrawals",
  authMiddleware,
  WalletController.getWithdrawals
);
router.get("/wallet/transfers", authMiddleware, WalletController.getTransfers);

router.put(
  "/users/:userId/kyc",
  authMiddleware,
  UserController.updateKycStatus
);
router.put(
  "/deposits/:depositId/confirm",
  authMiddleware,
  WalletController.confirmDeposit
);
router.put(
  "/withdrawals/:withdrawalId/complete",
  authMiddleware,
  WalletController.completeWithdrawal
);

export default router;

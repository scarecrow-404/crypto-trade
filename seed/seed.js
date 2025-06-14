import "dotenv/config";
import { Client } from "pg";
import { v4 as uuidv4 } from "uuid";

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function seedData() {
  try {
    await client.connect();
    const now = new Date().toISOString();

    const userId = uuidv4();
    const otherUserId = uuidv4();
    const btcId = uuidv4();
    const usdtId = uuidv4();

    await client.query(
      `
      INSERT INTO users (id, email, password_hash, first_name, last_name, kyc_status, created_at, is_active)
      VALUES
        ($1, 'alice@example.com', '$2b$10$gZR.r6OvvqP6KGkMz.A9KeUAUPD7n/MVApTwkSzz4xn.8PP47cTkC', 'Alice', 'Smith', 'verified', $2, true),
        ($3, 'bob@example.com', '$2b$10$gZR.r6OvvqP6KGkMz.A9KeUAUPD7n/MVApTwkSzz4xn.8PP47cTkC', 'Bob', 'Lee', 'verified', $2, true)
    `,
      [userId, now, otherUserId]
    );

    await client.query(
      `
      INSERT INTO currencies (id, symbol, name, type, decimal_places, is_active, created_at)
      VALUES
        ($1, 'BTC', 'Bitcoin', 'crypto', 8, true, $2),
        ($3, 'USDT', 'Tether', 'crypto', 6, true, $2)
    `,
      [btcId, now, usdtId]
    );

    await client.query(
      `
      INSERT INTO wallets (id, user_id, currency_id, balance, locked_balance, created_at)
      VALUES
        (uuid_generate_v4(), $1, $2, 1.5, 0.0, $4),
        (uuid_generate_v4(), $1, $3, 1000.0, 0.0, $4)
    `,
      [userId, btcId, usdtId, now]
    );

    const buyOrderId = uuidv4();
    const sellOrderId = uuidv4();

    await client.query(
      `
      INSERT INTO orders (id, user_id, base_currency_id, quote_currency_id, type, status, quantity, price, created_at)
      VALUES
        ($1, $2, $3, $4, 'buy', 'pending', 0.5, 25000, $5),
        ($6, $2, $3, $4, 'sell', 'pending', 0.3, 25500, $5)
    `,
      [buyOrderId, userId, btcId, usdtId, now, sellOrderId]
    );

    await client.query(
      `
      INSERT INTO trades (id, buy_order_id, sell_order_id, buyer_id, seller_id, base_currency_id, quote_currency_id, quantity, price, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0.3, 25200, $8)
    `,
      [uuidv4(), buyOrderId, sellOrderId, userId, userId, btcId, usdtId, now]
    );

    await client.query(
      `
      INSERT INTO transactions (id, user_id, currency_id, type, amount, status, created_at)
      VALUES 
        (uuid_generate_v4(), $1, $2, 'deposit', 500, 'completed', $3),
        (uuid_generate_v4(), $1, $2, 'trade', 100, 'completed', $3)
    `,
      [userId, usdtId, now]
    );

    await client.query(
      `
      INSERT INTO deposits (id, user_id, currency_id, amount, status, created_at)
      VALUES (uuid_generate_v4(), $1, $2, 500, 'confirmed', $3)
    `,
      [userId, usdtId, now]
    );

    await client.query(
      `
      INSERT INTO withdrawals (id, user_id, currency_id, amount, status, created_at)
      VALUES (uuid_generate_v4(), $1, $2, 200, 'completed', $3)
    `,
      [userId, btcId, now]
    );

    await client.query(
      `
      INSERT INTO transfers (id, from_user_id, to_user_id, currency_id, amount, status, created_at)
      VALUES (uuid_generate_v4(), $1, $2, $3, 150, 'completed', $4)
    `,
      [userId, otherUserId, usdtId, now]
    );

    await client.query(
      `
      INSERT INTO market_data (id, base_currency_id, quote_currency_id, last_price, volume_24h, updated_at)
      VALUES (uuid_generate_v4(), $1, $2, 25300, 120.5, $3)
    `,
      [btcId, usdtId, now]
    );

    console.log("Seed data inserted successfully.");
  } catch (err) {
    console.error("Failed to seed data:", err);
  } finally {
    await client.end();
  }
}

seedData();

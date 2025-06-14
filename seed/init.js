import "dotenv/config";
import { Client } from "pg";

const dbUrl = new URL(process.env.DATABASE_URL);
const dbName = dbUrl.pathname.slice(1);
dbUrl.pathname = "/postgres";

async function createDatabase() {
  const client = new Client({ connectionString: dbUrl.toString() });
  try {
    await client.connect();
    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database '${dbName}' created.`);
    } else {
      console.log(`ℹDatabase '${dbName}' already exists.`);
    }
  } catch (err) {
    console.error("Failed to create database:", err);
  } finally {
    await client.end();
  }
}

async function initSchema() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR UNIQUE,
        password_hash VARCHAR,
        first_name VARCHAR,
        last_name VARCHAR,
        kyc_status VARCHAR,
        created_at TIMESTAMP,
        is_active BOOLEAN
      );

      CREATE TABLE IF NOT EXISTS currencies (
        id UUID PRIMARY KEY,
        symbol VARCHAR UNIQUE,
        name VARCHAR,
        type VARCHAR,
        decimal_places INTEGER,
        is_active BOOLEAN,
        created_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id),
        currency_id UUID NOT NULL REFERENCES currencies(id),
        balance DECIMAL,
        locked_balance DECIMAL,
        created_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id),
        base_currency_id UUID NOT NULL REFERENCES currencies(id),
        quote_currency_id UUID NOT NULL REFERENCES currencies(id),
        type VARCHAR,
        status VARCHAR,
        quantity DECIMAL,
        price DECIMAL,
        created_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trades (
        id UUID PRIMARY KEY,
        buy_order_id UUID NOT NULL REFERENCES orders(id),
        sell_order_id UUID NOT NULL REFERENCES orders(id),
        buyer_id UUID NOT NULL REFERENCES users(id),
        seller_id UUID NOT NULL REFERENCES users(id),
        base_currency_id UUID REFERENCES currencies(id),
        quote_currency_id UUID REFERENCES currencies(id),
        quantity DECIMAL,
        price DECIMAL,
        created_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id),
        currency_id UUID NOT NULL REFERENCES currencies(id),
        type VARCHAR,
        amount DECIMAL,
        status VARCHAR,
        created_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS deposits (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id),
        currency_id UUID NOT NULL REFERENCES currencies(id),
        amount DECIMAL,
        status VARCHAR,
        created_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS withdrawals (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id),
        currency_id UUID NOT NULL REFERENCES currencies(id),
        amount DECIMAL,
        status VARCHAR,
        created_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transfers (
        id UUID PRIMARY KEY,
        from_user_id UUID NOT NULL REFERENCES users(id),
        to_user_id UUID NOT NULL REFERENCES users(id),
        currency_id UUID NOT NULL REFERENCES currencies(id),
        amount DECIMAL,
        status VARCHAR,
        created_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS market_data (
        id UUID PRIMARY KEY,
        base_currency_id UUID REFERENCES currencies(id),
        quote_currency_id UUID REFERENCES currencies(id),
        last_price DECIMAL,
        volume_24h DECIMAL,
        updated_at TIMESTAMP
      );
    `);

    console.log("Tables created successfully.");
  } catch (err) {
    console.error("Failed to initialize schema:", err);
  } finally {
    await client.end();
  }
}

(async () => {
  await createDatabase();
  await initSchema();
})();

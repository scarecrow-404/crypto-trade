# 🔐 Crypto Trading API

A simple trading platform API built with **Node.js**, **Express**, and **PostgreSQL**.

---

## Database ERD

[ERD](https://dbdiagram.io/d/684d6a003cc77757c8e08b77) <- click to open

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL database
- [Postman](https://www.postman.com/) for testing

---

### 📦 Installation

1. Clone the project:

```bash
git clone https://github.com/scarecrow-404/crypto-trade.git
cd crypto-trade
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root:

```env
NODE_ENV=development // just for identify
DATABASE_URL=postgres://username:password@localhost:5432/your_database
DB_HOST=... // or localhost
DB_PORT=... // or 5432
DB_USERNAME=... // username
DB_PASSWORD=... // password
DB_DATABASE=... // your_database name
PORT=... // or 3000

```

---

### 🛠️ Initialize the Database

Run the following commands to create the schema and insert sample data:

```bash
npm run init      # Runs init.js to create database and all it tables
npm run seed      # Runs seed.js to populate with sample data
```

---

### ▶️ Start the Server

```bash
npm run start
```

The server will start at: `http://localhost:3000`

---

## 🔑 Authentication & Testing via Postman

### 1. 🔐 Login

**POST** `/api/auth/login`

**Body (JSON):**

```json
{
  "email": "alice@example.com",
  "password": "hashed_pw"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "deca95de-2f0e-401c-9344-661dbd2819eb",
      "email": "alice@example.com",
      "first_name": "Alice",
      "last_name": "Smith",
      "kyc_status": "verified",
      "created_at": "2025-06-14T04:56:34.318Z",
      "is_active": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
}
```

---

### 2. ✅ Set Bearer Token in Postman

Once you receive the token:

1. Open any authenticated route (e.g., `GET /api/user/profile`)
2. Go to the **Authorization** tab
3. Select **Bearer Token**
4. Paste the token from the login response

Example:

```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 3. 🧪 Sample Authenticated Request

**GET** `/api/user/profile`

- Method: `GET`
- Authorization: `Bearer Token` from login
- Response:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "...",
    "first_name": "..."
  }
}
```

---

## 📂 Scripts

| Command         | Description                        |
| --------------- | ---------------------------------- |
| `npm run init`  | Creates all database tables        |
| `npm run seed`  | Inserts test data (users, wallets) |
| `npm run start` | Starts the server                  |

---

# 📘 API Overview: Crypto Trading Platform

---

## Authentication

### POST `/api/auth/register`

**Body:**

```json
{
  "email": "string",
  "password": "string",
  "first_name": "string",
  "last_name": "string"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "token": "..."
  }
}
```

---

### POST `/api/auth/login`

**Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "..."
  }
}
```

---

## User

### GET `/api/user/profile`

**Auth required:** Bearer Token
**Response:**

```json
{
  "success": true,
  "data": { ...userProfile }
}
```

### GET `/api/user/wallets`

**Auth required:** Bearer Token
**Response:** Array of wallets with balances and currencies.

### GET `/api/user/orders`

**Auth required:** Bearer Token
**Response:** List of orders with base/quote currency info and total value.

### GET `/api/user/transactions`

**Auth required:** Bearer Token
**Response:** List of user's transactions including currency info.

---

## Wallet

### POST `/api/wallet/deposit`

**Body:**

```json
{
  "currency_id": "string",
  "amount": number
}
```

**Response:** Deposit created (pending)

### POST `/api/wallet/withdraw`

**Body:**

```json
{
  "currency_id": "string",
  "amount": number
}
```

**Response:** Withdrawal created (pending)

### POST `/api/wallet/transfer`

**Body:**

```json
{
  "to_user_email": "string",
  "currency_id": "string",
  "amount": number
}
```

**Response:** Transfer completed

### GET `/api/wallet/deposits`

### GET `/api/wallet/withdrawals`

### GET `/api/wallet/transfers`

All return list of relevant items (with currency and user info).

---

## 🧾 Orders

### POST `/api/orders`

**Body:**

```json
{
  "base_currency_id": "string",
  "quote_currency_id": "string",
  "type": "buy" | "sell",
  "quantity": number,
  "price": number
}
```

**Response:** Order created

### DELETE `/api/orders/:orderId`

**Response:** Order cancelled

### GET `/api/orders/:base_currency_id/:quote_currency_id/book`

**Response:** Order book with buy/sell grouped

### GET `/api/orders/:base_currency_id/:quote_currency_id/trades`

**Query:** `?limit=number`
**Response:** Recent trade history

---

## KYC and Confirmations

### PUT `/api/users/:userId/kyc`

**Body:**

```json
{
  "kyc_status": "pending" | "verified" | "rejected"
}
```

**Response:** KYC updated

### PUT `/api/deposits/:depositId/confirm`

**Response:** Deposit confirmed

### PUT `/api/withdrawals/:withdrawalId/complete`

**Response:** Withdrawal completed

---

## Authorization

- All `/user`, `/wallet`, and `/orders` routes require **Bearer Token** in the Authorization header:

```
Authorization: Bearer <your-token>
```

Use `/auth/login` to retrieve the token.

---

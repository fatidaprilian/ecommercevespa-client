# Vespa Ecommerce API (Backend)

The backend server for the Vespa Ecommerce Platform, built using **NestJS**, **Prisma ORM**, and **PostgreSQL**. This service handles all business logic, database management, authentication, and third-party integrations (Midtrans, Cloudinary, Accurate, etc.).

## Core Technologies

- **Framework:** [NestJS](https://nestjs.com/) v11
- **Database ORM:** [Prisma](https://www.prisma.io/) v6
- **Database:** PostgreSQL
- **Queue/Background Jobs:** [BullMQ](https://docs.nestjs.com/techniques/queues) + Redis
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** Cloudinary
- **Payments:** Midtrans

---

## Main Directory Structure (`/src`)

- `auth/` - Authentication endpoints and logic (Login, Register, JWT Guard).
- `users/` - User profile management (Admin & Customer).
- `products/` - Product catalog management.
- `orders/` - Order system and lifecycle.
- `payments/` - Transaction logic and Midtrans integration.
- `common/` - Globally used Filters, Guards, Decorators, and Utilities.
- `prisma/` - Prisma schema, migrations, and database seeding script.

> For a complete, auto-generated list of API endpoints, please refer to **[API_DOCS.md](./API_DOCS.md)**.

---

## Development Guide

### 1. System Prerequisites
Ensure you have Node.js v22+, PostgreSQL v15+, and Redis v7+ running on your system.

### 2. Environment Configuration (`.env`)
Copy `.env.example` to `.env` and fill in all the required variables:
```bash
cp .env.example .env
```
*(Note: The NestJS application will throw a `FATAL ERROR` if any required variable is missing, due to strict validation in `app.module.ts`)*.

### 3. Database Setup (Prisma)
Run the following commands sequentially to set up the local database:
```bash
# 1. Apply schema to the database (generate tables)
npx prisma db push

# OR (if using the migration system)
npx prisma migrate dev

# 2. Generate Prisma Client
npx prisma generate

# 3. Seed initial data (Admin, Roles, etc.)
npx prisma db seed
```

### 4. Running the Server
```bash
# Install dependencies
npm install

# Development mode (Hot Reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The server will run at `http://localhost:3001/api/v1` (based on the `.env` configuration).

---

## Background Jobs & Redis
This project relies on **BullMQ** for asynchronous tasks such as:
- Sending emails.
- Accurate data synchronization.
- Clearing expired carts.

Ensure **Redis** is running properly. If Redis is down, the application may fail to start or experience timeouts on specific jobs.

## Rate Limiting (Throttler)
This API is protected against abuse and spam using `@nestjs/throttler`. The default configuration allows **150 requests per minute per IP**, which can be adjusted in `app.module.ts`.

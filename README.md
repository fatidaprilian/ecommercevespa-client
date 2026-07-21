<div align="center">

# Vespa Ecommerce Platform

**Official Technical Developer Guide**

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

*This document contains the complete technical guide for installation, architecture overview, and deployment of the Vespa Ecommerce Platform.*

</div>

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Monorepo Structure](#monorepo-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup-local-development)
  - [Method A: Docker Compose](#method-a-using-docker-compose-recommended)
  - [Method B: Manual Setup](#method-b-manual-setup-per-service)
- [Environment Variables](#environment-variables)
- [Database Management](#database-management)
- [Deployment](#deployment-production)
- [Troubleshooting](#troubleshooting)

---

## System Architecture

This project is built using a modern microservice/monorepo pattern where each module has a specific and distinct role.

```mermaid
graph TD
    Client[Storefront User] <-->|HTTP/REST| API(Backend NestJS API)
    Admin[Admin Panel User] <-->|HTTP/REST| API
    
    API <--> DB[(PostgreSQL)]
    API <--> Redis[(Redis Queue)]
    
    API -.->|Payment API| Midtrans[Midtrans Gateway]
    API -.->|Upload API| Cloudinary[Cloudinary]
    API -.->|Sync API| Accurate[Accurate Accounting]
```

| Service | Technology | Local Port | Description |
|---------|-----------|------|-------------|
| **Backend API** | NestJS + Prisma | `3001` | REST API Server, Core Logic |
| **Frontend Store** | Next.js (App Router) | `3000` | Customer-facing Storefront |
| **Frontend Admin** | Next.js (Pages Router) | `3003` | Admin Dashboard Panel |

---

## Monorepo Structure

Each directory in this project contains its own detailed documentation. Please refer to the links below for technical specifics:

- **[`/vespa-ecommerce-api`](./vespa-ecommerce-api/README.md)** - Backend Server & Database (Node.js).
- **[`/vespa-ecommerce-api/API_DOCS.md`](./vespa-ecommerce-api/API_DOCS.md)** - Complete List of API Endpoints.
- **[`/vespa-ecommerce-web`](./vespa-ecommerce-web/README.md)** - Storefront Website Source Code.
- **[`/vespa-ecommerce-admin`](./vespa-ecommerce-admin/README.md)** - Admin Dashboard Source Code.
- `docker-compose.yml` - Container orchestration for local environment.

---

## Prerequisites

| Software | Version | Notes |
|----------|---------|-------|
| **Node.js** | 22.x | Required on the host machine |
| **PostgreSQL** | 15.x+ | Primary relational database |
| **Redis** | 7.x | Required for background task queues |
| **Docker** | Latest | Highly recommended for local development |

---

## Installation & Setup (Local Development)

### Method A: Using Docker Compose (Recommended)

This is the fastest way to run the entire stack (Database, Redis, API, Web, Admin) with a single command.

1. **Clone and Enter Directory**
   ```bash
   git clone <repository_url>
   cd vespa-ecommerce
   ```
2. **Setup Environment Variables**
   Copy the `.env.example` file to `.env` in each respective sub-folder (`api`, `web`, `admin`) and fill in the required credentials.
3. **Run Docker**
   ```bash
   docker-compose up --build
   ```
   *This process will automatically run database migrations and seeding.*

**Access the Applications:**
- Store: http://localhost:3000
- Admin: http://localhost:3003
- API: http://localhost:3001/api/v1

### Method B: Manual Setup (Per Service)

If you prefer running the services without Docker:

1. Ensure PostgreSQL and Redis are running. Create a database named `vespapart_ecommerce`.
2. Navigate to each directory (`vespa-ecommerce-api`, `vespa-ecommerce-web`, `vespa-ecommerce-admin`).
3. Run `npm install`.
4. Configure `.env` / `.env.local` files in each directory.
5. In the `api` folder specifically, apply the migration: `npx prisma migrate deploy` followed by `npx prisma db seed`.
6. Run `npm run dev` in separate terminals for each service.

---

## Environment Variables

> Attention: The API application will fail to start if any required environment variable is missing.

### Backend (`vespa-ecommerce-api/.env`)

```ini
# Database & Redis
DATABASE_URL="postgresql://user:pass@localhost:5432/vespapart_ecommerce?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6379

# Security
JWT_SECRET="your_secret_key"
JWT_EXPIRES_IN="7d"

# 3rd Party Integrations (Required)
MIDTRANS_SERVER_KEY="xxx"
CLOUDINARY_CLOUD_NAME="xxx"
BITESHIP_API_KEY="xxx"
# See .env.example for Accurate & SMTP Email details
```

### Frontend (`.env.local`)

```ini
# NEXT_PUBLIC_ = Variables exposed to the browser
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
```

---

## Database Management

This project uses **Prisma ORM**. Here are the common commands:

- `npx prisma migrate dev` : Create migration files from schema changes.
- `npx prisma db push` : Force sync the schema to the database (for development).
- `npx prisma studio` : A web-based UI to view and manage data.

**Default Admin Account:** Created automatically after the seeding process. Please change the password immediately in production.

---

## Deployment (Production)

Use the optimized **Docker Image** (`Dockerfile.prod`) for production environments.

```bash
# Build Backend
cd vespa-ecommerce-api && docker build -f Dockerfile.prod -t vespa-api:latest .

# Build Web
cd vespa-ecommerce-web && docker build -f Dockerfile.prod -t vespa-web:latest .

# Build Admin
cd vespa-ecommerce-admin && docker build -f Dockerfile.prod -t vespa-admin:latest .
```

Run the production containers using a production-specific environment file (e.g., `.env.production`).

---

## Troubleshooting

1. **Accurate OAuth Callback Error (Invalid redirect_uri):** Ensure the URL in the `.env` (Backend) exactly matches the one registered in the Accurate Developer Portal.
2. **Next.js Images not loading:** Check the remote patterns configuration in `next.config.ts` for the `res.cloudinary.com` host.
3. **Redis Connection Failed:** Ensure port `6379` is open and Redis is running (type `redis-cli ping` in the terminal, it should reply with `PONG`).
4. **P1001 Database Reach Error:** Verify the connection URI format in `DATABASE_URL` and ensure the PostgreSQL service is active.

---
<div align="center">
<b>Copyright © KODEKIRI Development Team.</b>
</div>
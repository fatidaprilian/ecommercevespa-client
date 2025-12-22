<div align="center">

# 🛵 Vespa Ecommerce Platform

**Technical Developer Guide**

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)

*Dokumen ini berisi panduan teknis untuk instalasi, konfigurasi, dan deployment proyek Vespa Ecommerce Platform.*

</div>

---

## 📋 Daftar Isi

- [Arsitektur Sistem](#-arsitektur-sistem)
- [Prerequisites](#-prerequisites-prasyarat-sistem)
- [Struktur Proyek](#-struktur-proyek)
- [Instalasi & Setup](#-instalasi--setup-local-development)
  - [Metode A: Docker Compose](#metode-a-menggunakan-docker-compose-direkomendasikan)
  - [Metode B: Manual Setup](#metode-b-instalasi-manual-per-service)
- [Environment Variables](#-environment-variables)
  - [Backend Environment](#backend-vespa-ecommerce-apienv)
  - [Frontend Environment](#frontend-envlocal)
- [Database Management](#-database-management-prisma-orm)
- [Deployment](#-deployment-production)
- [Troubleshooting](#-troubleshooting-umum)

---

## 🏗️ Arsitektur Sistem

Proyek ini menggunakan arsitektur **Monorepo** (secara struktur folder) yang terdiri dari tiga layanan utama:

| Service | Technology | Port | Description |
|---------|-----------|------|-------------|
| 🔧 **Backend API** | NestJS + Prisma | 3001 | REST API Server |
| 🛒 **Frontend Store** | Next. js (App Router) | 3000 | Customer-facing Storefront |
| 📊 **Frontend Admin** | Next.js (Pages Router) | 3003 | Dashboard Admin Panel |

---

## 🔧 Prerequisites (Prasyarat Sistem)

Sebelum memulai pengembangan atau deployment, pastikan lingkungan server atau lokal Anda memiliki perangkat lunak berikut:

| Software | Version | Required | Notes |
|----------|---------|----------|-------|
| **Node.js** | 22.x | ✅ Yes | Sesuai dengan base image `node:22-alpine` |
| **npm** | Latest | ✅ Yes | Bawaan Node.js |
| **PostgreSQL** | 15.x+ | ✅ Yes | Database utama |
| **Redis** | 7.x | ✅ Yes | Wajib untuk BullMQ/Queue management |
| **Docker & Docker Compose** | Latest | ⚠️ Optional | Disarankan untuk deployment |

---

## 📁 Struktur Proyek

```text
root/
├── 📄 docker-compose.yml           # Orkestrasi container untuk local development
├── 🔧 vespa-ecommerce-api/         # Backend Server (NestJS + Prisma)
│   ├── prisma/                     # Database schema & migrations
│   ├── src/                        # Source code API
│   ├── Dockerfile.prod             # Production Docker image
│   └── entrypoint.sh               # Auto-migration script
├── 🛒 vespa-ecommerce-web/         # Storefront User (Next.js App Router)
│   ├── app/                        # Next.js 15 App Directory
│   ├── components/                 # React components
│   └── Dockerfile.prod             # Production Docker image
└── 📊 vespa-ecommerce-admin/       # Dashboard Admin (Next.js Pages Router)
    ├── pages/                      # Next.js Pages
    ├── components/                 # Admin components
    └── Dockerfile. prod             # Production Docker image
```

---

## 🚀 Instalasi & Setup (Local Development)

### Metode A: Menggunakan Docker Compose (Direkomendasikan)

> ⚡ Cara tercepat untuk menjalankan seluruh stack (Database, Redis, API, Web, Admin) secara bersamaan.

#### 1️⃣ Clone Repository

```bash
git clone <repository_url>
cd vespa-ecommerce
```

#### 2️⃣ Konfigurasi Environment

Salin file `vespa-ecommerce-api/.env.example` menjadi `.env` di setiap folder (`api`, `web`, `admin`) dan sesuaikan isinya.  

```bash
# Backend
cp vespa-ecommerce-api/. env.example vespa-ecommerce-api/.env

# Frontend Store
cp vespa-ecommerce-web/.env.example vespa-ecommerce-web/.env. local

# Frontend Admin
cp vespa-ecommerce-admin/. env.example vespa-ecommerce-admin/.env.local
```

> 📌 **Penting:** Edit setiap file `.env` sesuai dengan kredensial Anda (lihat [Bagian Environment Variables](#-environment-variables)).

#### 3️⃣ Jalankan Container

```bash
docker-compose up --build
```

**✅ Apa yang terjadi:**
- PostgreSQL dan Redis akan diinisialisasi
- `entrypoint.sh` pada API akan otomatis menjalankan migrasi database dan seeding
- Semua service akan berjalan di port yang ditentukan

**🌐 Akses Aplikasi:**
- Backend API: http://localhost:3001
- Frontend Store: http://localhost:3000
- Frontend Admin: http://localhost:3003

---

### Metode B: Instalasi Manual (Per Service)

> 💻 Jika Anda ingin menjalankan service secara terpisah tanpa Docker. 

#### 1️⃣ Setup Database & Redis

Pastikan PostgreSQL dan Redis server sudah berjalan di mesin lokal Anda. 

**Buat Database Baru:**

```sql
CREATE DATABASE vespapart_ecommerce;
```

#### 2️⃣ Setup Backend (API)

```bash
cd vespa-ecommerce-api

# Install dependencies
npm install

# Setup Environment Variable
cp .env.example .env
# ⚠️ Edit . env sesuaikan dengan kredensial DB lokal Anda

# Migrasi Database & Seeding Data Awal
npx prisma migrate deploy
npx prisma db seed

# Jalankan Server (Development Mode)
npm run start:dev
```

**✅ Server akan berjalan di:** http://localhost:3001

#### 3️⃣ Setup Frontend Store (Web)

```bash
cd vespa-ecommerce-web

# Install dependencies
npm install

# Setup Environment Variable
cp .env. example .env. local
# ⚠️ Edit .env.local (lihat bagian Frontend Environment)

# Jalankan Development Server
npm run dev
```

**✅ Web akan berjalan di:** http://localhost:3000

#### 4️⃣ Setup Frontend Admin

```bash
cd vespa-ecommerce-admin

# Install dependencies
npm install

# Setup Environment Variable
cp .env.example .env.local
# ⚠️ Edit .env.local (lihat bagian Frontend Environment)

# Jalankan Development Server
npm run dev
```

**✅ Admin akan berjalan di:** http://localhost:3003 *(sesuai docker-compose)*

---

## ⚙️ Environment Variables

> ⚠️ **PERINGATAN:** Aplikasi Backend memiliki validasi ketat saat startup. Jika variabel wajib tidak diisi, aplikasi akan melempar error `FATAL ERROR`.

### Backend (`vespa-ecommerce-api/.env`)

#### 🗄️ Database & App Config

```ini
# Database Connection
DATABASE_URL="postgresql://user:pass@localhost:5432/vespapart_ecommerce? schema=public"

# JWT Authentication
JWT_SECRET="your_super_secure_secret_here"
JWT_EXPIRES_IN="7d"

# Application
PORT=3001
FRONTEND_URL="http://localhost:3000"
ADMIN_URL="http://localhost:3003"
```

#### 🔴 Redis (Queue Management)

```ini
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
```

#### 💳 Integrasi Pihak Ketiga (Wajib Diisi)

<details>
<summary><b>Midtrans (Payment Gateway)</b></summary>

```ini
MIDTRANS_SERVER_KEY="SB-Mid-server-xxxxxxxxxxxxx"
MIDTRANS_CLIENT_KEY="SB-Mid-client-xxxxxxxxxxxxx"
MIDTRANS_IS_PRODUCTION=false
```

> 📌 Dapatkan kredensial di [Midtrans Dashboard](https://dashboard.midtrans.com/)

</details>

<details>
<summary><b>Cloudinary (Image Storage)</b></summary>

```ini
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

> 📌 Dapatkan kredensial di [Cloudinary Console](https://console.cloudinary.com/)

</details>

<details>
<summary><b>Biteship (Shipping Integration)</b></summary>

```ini
BITESHIP_API_KEY="your_biteship_api_key"
```

> 📌 Dapatkan kredensial di [Biteship Dashboard](https://biteship.com/)

</details>

<details>
<summary><b>Accurate Accounting (OAuth2)</b></summary>

```ini
ACCURATE_CLIENT_ID="your-client-id"
ACCURATE_CLIENT_SECRET="your-client-secret"
ACCURATE_REDIRECT_URI="http://localhost:3001/api/v1/accurate/callback"
ACCURATE_AUTH_URL="https://account.accurate.id/oauth/authorize"
ACCURATE_TOKEN_URL="https://account.accurate.id/oauth/token"
ACCURATE_API_BASE_URL="https://public.accurate.id"
```

> 📌 Dapatkan kredensial di [Accurate Developer Portal](https://developer.accurate.id/)

</details>

#### 📧 Email & Security

```ini
# SMTP Configuration
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT=465
SMTP_USER="info@yourdomain.com"
SMTP_PASSWORD="your_email_password"

# Cloudflare Turnstile (Captcha)
TURNSTILE_SECRET_KEY="your_turnstile_secret_key"
```

> 📌 Dapatkan Turnstile key di [Cloudflare Dashboard](https://dash.cloudflare.com/)

---

### Frontend (`.env.local`)

> 📌 Pastikan variabel publik diawali dengan `NEXT_PUBLIC_`.

**Untuk `vespa-ecommerce-web` dan `vespa-ecommerce-admin`:**

```ini
# Backend API URL
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"

# Cloudflare Turnstile (Captcha)
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your_turnstile_site_key"
```

---

## 🗃️ Database Management (Prisma ORM)

Proyek ini menggunakan **Prisma ORM**. Berikut adalah perintah umum yang sering digunakan:

| Perintah | Fungsi | Kapan Digunakan |
|----------|--------|----------------|
| `npx prisma db push` | Sinkronisasi Schema ke DB (Tanpa Migrasi) | Development/Prototyping |
| `npx prisma migrate dev --name nama_perubahan` | Membuat File Migrasi Baru | Setelah edit `schema.prisma` |
| `npx prisma migrate deploy` | Apply Migrasi di Production | Deployment ke production |
| `npx prisma generate` | Generate Prisma Client | Wajib setelah `npm install` |
| `npx prisma studio` | Melihat Data via GUI | Development/Debugging |
| `npx prisma db seed` | Seeding Data (Admin & Config) | Initial setup |

### 🌱 Default Admin Account

Setelah menjalankan `npx prisma db seed`, sistem akan membuat akun admin default. 

> ⚠️ **PENTING UNTUK KEAMANAN:**
> - Segera ganti password default setelah login pertama kali
> - Nonaktifkan atau hapus akun default di environment production
> - Gunakan email dan password yang kuat untuk admin production

**Cara mengganti password admin:**
```bash
# Gunakan endpoint API:  PATCH /api/v1/auth/change-password
# Gunakan seed.ts
```

---

## 🚢 Deployment (Production)

Untuk lingkungan produksi, disarankan menggunakan **Docker Image** yang telah dioptimasi (`Dockerfile.prod`).

### 🐳 Build & Run (Docker)

Setiap layanan memiliki `Dockerfile. prod` **multi-stage build** untuk memperkecil ukuran image. 

#### Build Backend API

```bash
cd vespa-ecommerce-api
docker build -f Dockerfile.prod -t vespa-api:latest .
```

#### Run Backend API

```bash
docker run -d \
  -p 3001:3001 \
  --env-file .env. production \
  --name vespa-api \
  vespa-api: latest
```

> 📌 **Catatan:** `entrypoint.sh` pada API akan otomatis menjalankan `npx prisma migrate deploy` saat container pertama kali dijalankan.

#### Build Frontend (Web & Admin)

```bash
# Frontend Store
cd vespa-ecommerce-web
docker build -f Dockerfile. prod -t vespa-web: latest .

# Frontend Admin
cd vespa-ecommerce-admin
docker build -f Dockerfile. prod -t vespa-admin: latest .
```

---

### 🛠️ Build Manual (Tanpa Docker)

#### Backend (NestJS)

```bash
cd vespa-ecommerce-api

# Build untuk production
npm run build

# Output ada di folder /dist
# Jalankan dengan Node.js
NODE_ENV=production node dist/src/main.js
```

#### Frontend (Next.js)

```bash
cd vespa-ecommerce-web  # atau vespa-ecommerce-admin

# Build untuk production
npm run build

# Output ada di folder /.next
# Jalankan production server
NODE_ENV=production npm start
```

> ⚠️ **Penting:** Pastikan `NODE_ENV=production` diset di server untuk performa optimal.

---

## 🔍 Troubleshooting Umum

### ❌ 1. Error Koneksi Accurate

**Gejala:**
```
Error: OAuth callback failed - Invalid redirect_uri
```

**Solusi:**
- ✅ Pastikan `ACCURATE_REDIRECT_URI` di `.env` **sama persis** dengan yang didaftarkan di Developer Portal Accurate
- ✅ Token Accurate memiliki masa berlaku.  Gunakan endpoint `/api/v1/accurate/disconnect` jika perlu reset koneksi
- ✅ Periksa whitelist IP di dashboard Accurate

---

### 🖼️ 2. Gambar Tidak Muncul

**Gejala:**
```
Error: Invalid src prop on `next/image`
```

**Solusi:**
- ✅ Cek konfigurasi `next.config.ts` pada Frontend
- ✅ Pastikan domain Cloudinary (`res.cloudinary.com`) sudah terdaftar di `images.remotePatterns`

**Contoh konfigurasi yang benar:**

```typescript
// next.config.ts
const config = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};
```

---

### ⏱️ 3. Timeout saat Build

**Gejala:**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solusi:**

**Opsi 1: Tingkatkan Memory Limit**
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

**Opsi 2: Aktifkan Swap Memory (Linux)**
```bash
# Buat 2GB swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**Opsi 3: Build di Mesin Lebih Powerful**
- Gunakan GitHub Actions atau CI/CD pipeline
- Build di lokal, push image ke Docker Registry

---

### 🔌 4. Redis Connection Failed

**Gejala:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solusi:**
- ✅ Pastikan Redis server sudah running:  `redis-cli ping` (harus return `PONG`)
- ✅ Periksa firewall:  `sudo ufw allow 6379`
- ✅ Cek konfigurasi `REDIS_HOST` dan `REDIS_PORT` di `.env`

---

### 🗄️ 5. Database Migration Failed

**Gejala:**
```
Error: P1001:  Can't reach database server
```

**Solusi:**
- ✅ Verifikasi `DATABASE_URL` di `.env`
- ✅ Test koneksi:  `psql -U user -h localhost -d vespapart_ecommerce`
- ✅ Pastikan PostgreSQL service running:  `sudo systemctl status postgresql`

---

## 📞 Support & Kontribusi

Jika menemukan bug atau ingin berkontribusi:

1. 🐛 **Bug Report:** Buat issue dengan label `bug`
2. 💡 **Feature Request:** Buat issue dengan label `enhancement`
3. 🔀 **Pull Request:** Fork repository dan buat PR ke branch `develop`

---

## 📄 License

Dokumen ini adalah properti internal untuk tim development KODEKIRI. 

---

<div align="center">

**Made with ❤️ by KODEKIRI Development Team**

</div>
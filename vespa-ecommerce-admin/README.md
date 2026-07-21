# Vespa Ecommerce Admin (Dashboard)

The frontend application for the Admin Dashboard. This is where administrators can manage products, view orders, handle static content (CMS), and monitor sales statistics. It is built using **Next.js (Pages Router)**.

## Core Technologies

- **Framework:** [Next.js](https://nextjs.org/) (Pages Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Radix UI](https://www.radix-ui.com/)
- **Rich Text Editor:** [Tiptap](https://tiptap.dev/) (For CMS page management)
- **Data Fetching:** TanStack React Query / Axios
- **Form & Validation:** React Hook Form + Zod
- **Authentication Management:** JS-Cookie

---

## Main Directory Structure

This project utilizes the Next.js **Pages Router** architecture.

- `pages/` - Every file in this directory automatically becomes a route (e.g., `pages/auth/login.tsx` maps to `/auth/login`).
  - `pages/api/` - (Optional) Next.js built-in API routes.
- `components/` - User interface components. Many of these are built on top of Radix UI primitives.
  - `components/settings/` - Contains complex components such as the `PageEditor` (Tiptap).
- `lib/` - Contains utility functions, custom formatters, and helpers.
- `services/` - Contains files handling API calls and Axios instances configured to communicate with the main backend.
- `public/` - Static assets.

---

## Development Guide

### 1. System Prerequisites
- Node.js v22+
- The Backend API (`vespa-ecommerce-api`) must be running. Ensure that the API has CORS enabled for the admin port (which defaults to `3003`).

### 2. Environment Configuration (`.env.local`)
Create or copy `.env.local`:
```bash
cp .env.example .env.local
```

**Key Variables:**
- `NEXT_PUBLIC_API_URL`: The URL for the main backend API (example: `http://localhost:3001/api/v1`).

### 3. Running the Application
```bash
# Install dependencies
npm install

# Development Server (using Turbopack)
npm run dev

# Production Build & Start
npm run build
npm run start
```
By default, the Admin panel will run at `http://localhost:3003` (this port is specified in the `dev` script inside `package.json` using the `-p 3003` flag).

---

## Authentication
The Admin Dashboard is integrated with the backend API. Upon successful login, the authorization token is saved using `js-cookie` and automatically attached to every outgoing request via Axios Interceptors located in the `services/` directory.

Important: If you log in using the default admin account (provided by the backend seeding process), make sure to change the password immediately after deployment for security reasons.

## Content Management System (CMS)
This application includes a Rich Text editor powered by **Tiptap**. This feature is utilized on pages like "About Us", "Terms & Conditions", and "Privacy Policy", allowing administrators to manage content that is directly rendered on the Storefront application.

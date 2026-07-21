# Vespa Ecommerce Web (Storefront)

The frontend application (Storefront) for end users. This is where customers can browse products, add items to their cart, proceed to checkout, and track their orders. It is built using **Next.js 15 (App Router)** alongside a modern React ecosystem.

## Core Technologies

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/) (Client State) & React Query/SWR (Server State)
- **UI Components:** [Radix UI](https://www.radix-ui.com/)
- **Forms & Validation:** React Hook Form + Zod
- **Animations:** Framer Motion

---

## Main Directory Structure

This project utilizes the Next.js **App Router** architecture.

- `app/` - Page definitions (Routes) such as `/cart`, `/checkout`, `/contact`, etc.
- `app/components/` - Reusable React components.
  - `/atoms` - Basic building blocks (Buttons, Inputs, etc).
  - `/molecules` - Combined components (Search bar, Product cards).
  - `/organisms` - Complex sections (HeroSection, Header, Footer).
- `app/hooks/` - Custom React hooks for specific business logic (e.g., `use-products.ts`).
- `public/` - Static assets including images, favicons, and fonts.

---

## Development Guide

### 1. System Prerequisites
- Node.js v22+
- The Backend API (`vespa-ecommerce-api`) must be running locally, as this frontend fetches data directly from it.

### 2. Environment Configuration (`.env.local`)
Copy the `.env.example` file to `.env.local` (following Next.js conventions).
```bash
cp .env.example .env.local
```

**Key Variables:**
- `NEXT_PUBLIC_API_URL`: The URL for the backend API (example: `http://localhost:3001/api/v1`).
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: (Optional) Required if you are using Cloudflare Turnstile for captchas.

### 3. Running the Application
```bash
# Install dependencies
npm install

# Development Server
npm run dev

# Production Build & Start
npm run build
npm run start
```
The application will run at `http://localhost:3000`.

---

## Components & Styling
This project adopts a headless component pattern using Radix UI, fully styled with Tailwind CSS. This approach ensures that the resulting user interface is highly accessible, responsive, and lightweight.

To apply class variants dynamically, the project uses a combination of `clsx` and `tailwind-merge`, which are often exported as a `cn()` utility function found in the `utils` directory.

## Data Fetching
The application uses modern data fetching patterns:
- **Server Components:** Utilized whenever possible (especially on static or main pages) to ensure faster initial load times and optimal SEO.
- **Client Fetching:** Uses SWR or TanStack React Query (via custom hooks in the `hooks/` directory) for dynamic data that requires automatic polling or client-side caching (such as cart contents or user login status).

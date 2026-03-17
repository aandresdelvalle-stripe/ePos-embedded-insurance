# Stripe SWAG Shop

React frontend and Node.js backend for the Stripe SWAG Shop.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   cd server && npm install && cd ..
   ```

2. **Configure backend URL (frontend)**

   Copy `.env.example` to `.env` and set your API base URL:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   ```
   VITE_API_URL=http://localhost:8080
   ```

   (No trailing slash. The included Node server runs on 8080 by default.)

3. **Configure Stripe (backend)**

   In the `server` directory, copy `server/.env.example` to `server/.env` and set your Stripe secret key:

   ```bash
   cp server/.env.example server/.env
   ```

   Edit `server/.env` and set `STRIPE_TEST_SECRET_KEY=sk_test_...`. The server uses this to load products from the Stripe product catalog. Only products whose metadata has `swag: true` are returned.

## Run

**Backend (Node.js)**

- From project root: `cd server && npm run dev` — API at `http://localhost:8080`
- Or: `cd server && npm start` — same, without file watching

**Frontend (React)**

- From project root: `npm run dev` — app at `http://localhost:3000`
- Build: `npm run build` — output in `dist/`
- Preview build: `npm run preview`

Run the server first, then the frontend, so the shop can load products from the API.

## Backend contract

The app expects the backend to expose:

- **GET** `{VITE_API_URL}/products` — returns a list of products. The app accepts:
  - A JSON array, or
  - An object with a `products` or `items` array.

  Each product may have:

  - `id` or `sku`
  - `name` or `title`
  - `price` or `amount` (number or string; displayed in GBP £)
  - `imageUrl`, `image`, or `image_url` (optional)

If `VITE_API_URL` is unset or the request fails, the landing page shows 10 placeholder products.

## Project layout

**Frontend**

- `src/api/client.js` — API client using `VITE_API_URL`
- `src/components/Header.jsx` — header with Stripe logo, “SWAG Shop” title, cart icon
- `src/components/ProductCard.jsx` — product card (image, title, price, “Add to cart”)
- `src/pages/LandingPage.jsx` — main page and product grid

**Backend**

- `server/index.js` — Express server; fetches products from Stripe (metadata `swag: true`), `GET /products`, `GET /health`
- `server/package.json` — backend dependencies (express, cors, stripe, dotenv)

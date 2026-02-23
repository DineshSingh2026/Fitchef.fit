# FitChef Admin Dashboard

## Going live (production)

On your live site, admin login works with **no port or URL config**:

- **URL:** `https://yourdomain.com/admin` (or `https://fitchef.fit/admin`)
- Same server serves the site and the API, so the browser uses the same host. No port in the address bar; login and all dashboard API calls use relative paths (`/api/admin/...`) so they always hit the correct backend.
- Ensure **HTTPS** and a strong **JWT_SECRET** and admin password in production.

---

## Run locally

1. **Environment**
   - Copy `.env.example` to `.env` and set:
     - `PORT` (e.g. `3003`)
     - `DATABASE_URL` (PostgreSQL connection string)
     - `JWT_SECRET` (e.g. a long random string for production)
     - Optional: `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`, `INITIAL_ADMIN_NAME` for the first admin user.

2. **Database** (form submissions are stored here and shown in admin Leads)
   - Early-access emails: `npm run db:init` (creates `early_access` table)
   - Consultation form: `npm run db:consultations` (creates `consultations` table)
   - Admin tables (and Leads): `npm run db:admin` (creates `admin_leads`, etc.)
   - Seed the first admin user: `npm run db:seed-admin`

3. **Start server**
   - `npm install`
   - `npm start`

4. **Open admin**
   - Login: **http://localhost:3003/admin/index.html** (or your `PORT`)
   - After login you are redirected to the dashboard.

---

## Admin login details (default)

After running `npm run db:seed-admin` with default env:

| Field    | Value           |
|----------|-----------------|
| **Email**    | `admin@fitchef.fit` |
| **Password** | `Admin@123`        |

Change these by setting `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` in `.env` before running `db:seed-admin`. If an admin with that email already exists, the seed script skips creation.

---

## Project structure (admin)

- **Backend**
  - `server.js` – mounts `/api/admin/auth` and `/api/admin`
  - `routes/adminAuth.js` – POST `/api/admin/auth/login`
  - `routes/admin.js` – protected admin API (JWT + role middleware)
  - `middleware/auth.js` – JWT verification
  - `middleware/roleCheck.js` – require admin role
  - `controllers/admin/*` – auth, dashboard KPIs/chart, orders, chefs, logistics, customers, leads, finance
  - `models/AdminUser.js` – admin user lookup

- **Database**
  - `scripts/init-admin.sql` – tables: admin_users, admin_customers, admin_chefs, admin_orders, admin_deliveries, admin_payments, admin_leads (with FKs and indexes)
  - `scripts/run-init-admin.js` – runs init-admin.sql via `pg`
  - `scripts/seed-admin.js` – creates first admin user (bcrypt)

- **Frontend**
  - `public/admin/index.html` – login page
  - `public/admin/dashboard.html` – dashboard (sidebar, navbar, KPIs, revenue chart, Orders / Chefs / Logistics / Customers / Leads / Finance)
  - `public/admin/css/admin.css` – styles
  - `public/admin/js/admin.js` – `API_BASE`, `getAuthHeaders()`, `adminLogout()`

---

## API (all require `Authorization: Bearer <token>` except login)

- `POST /api/admin/auth/login` – body: `{ "email", "password" }` → `{ "token", "user" }`
- `GET /api/admin/dashboard/kpis` – KPI counts
- `GET /api/admin/dashboard/revenue-chart?period=30` – revenue by day
- `GET/POST/PATCH /api/admin/orders`, `GET/PATCH /api/admin/orders/:id`
- `GET/POST/PATCH /api/admin/chefs`, `GET/PATCH /api/admin/chefs/:id`
- `GET/POST/PATCH /api/admin/logistics`, `GET/PATCH /api/admin/logistics/:id`
- `GET/POST/PATCH /api/admin/customers`, `GET/PATCH /api/admin/customers/:id`
- `GET/POST/PATCH /api/admin/leads`, `GET/PATCH /api/admin/leads/:id`
- `GET /api/admin/finance/analytics?period=30`, `GET /api/admin/finance/payments`, `POST /api/admin/finance/payments`

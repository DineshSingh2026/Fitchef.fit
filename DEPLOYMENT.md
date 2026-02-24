# FitChef Deployment Guide

## 1. Local / first-time setup

1. **Copy env and set secrets**
   - `.env` is created from `.env.example`. Edit `.env` and set:
     - **DATABASE_URL** – your PostgreSQL connection string (e.g. from Render, Railway, Neon, Supabase).
     - **PORT** – leave as `3000` or set what your host uses.
     - **JWT_SECRET** – a long random string (e.g. run `openssl rand -hex 32` and paste the result).

2. **Install and start**
   ```bash
   npm install
   npm start
   ```
   - On first start with `DATABASE_URL` set, the app runs migrations and seeds (admin, chef, logistics users + default delivery agent).

3. **Health check**
   - **URL:** `GET /api/health`
   - **200:** `{ "status": "ok", "db": "connected" }` – use this for load balancer or monitoring.
   - **503:** DB not configured or unreachable.

---

## 2. Deploy to a host (Render, Railway, Heroku, etc.)

### Required environment variables on the host

| Variable       | Required | Example / note |
|----------------|----------|-----------------|
| **DATABASE_URL** | Yes     | `postgresql://user:pass@host:5432/dbname` (from host’s Postgres add-on). |
| **PORT**       | No       | Host often sets this (e.g. `3000`, `8080`). Use `process.env.PORT` in app (already done). |
| **JWT_SECRET** | Yes      | Long random string (e.g. `openssl rand -hex 32`). Do not use the default from .env.example. |

### Render

1. New **Web Service**, connect repo, set:
   - **Build:** `npm install`
   - **Start:** `npm start`
   - **Environment:** Add `DATABASE_URL` (from Render Postgres or external) and `JWT_SECRET`.
2. **Health Check Path:** `/api/health` (optional; helps Render know when the app is up).

### Railway

1. New project from repo. Add **PostgreSQL** (or use existing DB).
2. In service **Variables**, set `DATABASE_URL` (often auto-set if Postgres is in same project) and `JWT_SECRET`.
3. Deploy; start command is `npm start`. Use **Settings → Health Check** with path `/api/health` if available.

### Heroku

1. Create app, add **Heroku Postgres** (or use external DB).
2. **Config Vars:** Set `JWT_SECRET`. `DATABASE_URL` is set automatically if you use Heroku Postgres.
3. Deploy (e.g. GitHub or `git push heroku main`). Start: `npm start` or ensure `Procfile`: `web: node server.js` (or `npm start`).
4. **Review Apps → Settings → Health check:** set path to `/api/health` if the stack supports it.

---

## 3. After deploy

- **Migrations and seeds** run on first start when `DATABASE_URL` is set (see `config/ensureDb.js`).
- Default logins (change in production via env overrides if needed):
  - **Admin:** `admin@fitchef.fit` / `Admin@123`
  - **Chef:** `chef@fitchef.fit` / `Chef@123`
  - **Logistics:** `logistics@fitchef.fit` / `Logistics@123`
- Point load balancer or uptime monitoring at **GET your-domain/api/health**.

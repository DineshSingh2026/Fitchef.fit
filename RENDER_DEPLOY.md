# Deploy FitChef.fit on Render

Two options: **Blueprint (recommended)** or **manual** setup.

---

## Option A: Blueprint (one-click)

1. Push the repo (it includes `render.yaml`).
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect your GitHub account and select **DineshSingh2026/Fitchef.fit**.
4. Render will detect `render.yaml`. Click **Apply**.
5. Render creates:
   - A **PostgreSQL** database (`fitchef-db`)
   - A **Web Service** (`fitchef-fit`) with `DATABASE_URL` and a generated `JWT_SECRET`.
6. After the first deploy, run the DB setup **once** in the Web Service **Shell** (Dashboard → fitchef-fit → **Shell** tab):
   ```bash
   npm run db:init
   npm run db:consultations
   npm run db:admin
   npm run db:seed-admin
   ```
7. Your site: `https://fitchef-fit.onrender.com` (or the URL Render shows).  
   Admin: `https://fitchef-fit.onrender.com/admin`  
   Login: `admin@fitchef.fit` / `Admin@123` (unless you set `INITIAL_ADMIN_*` in Environment).

---

## Option B: Manual setup

### 1. Create PostgreSQL database

- Dashboard → **New** → **PostgreSQL**.
- Name: `fitchef-db`, Region: choose nearest.
- Plan: **Free** (or paid).
- Create. Copy the **Internal Database URL** (you’ll use it as `DATABASE_URL`).

### 2. Create Web Service

- Dashboard → **New** → **Web Service**.
- Connect **GitHub** and select **DineshSingh2026/Fitchef.fit** (or your fork).
- Branch: `master`.

**Settings:**

| Field | Value |
|-------|--------|
| **Name** | `fitchef-fit` (or any) |
| **Region** | Same as DB (e.g. Oregon) |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | Free |

### 3. Environment variables

In the Web Service → **Environment** tab, add:

| Key | Value | Notes |
|-----|--------|------|
| `NODE_ENV` | `production` | Recommended |
| `DATABASE_URL` | *(paste Internal Database URL from step 1)* | Required |
| `JWT_SECRET` | *(long random string, e.g. 32+ chars)* | Required for admin login |
| `INITIAL_ADMIN_EMAIL` | `admin@fitchef.fit` | Optional, default |
| `INITIAL_ADMIN_PASSWORD` | *(strong password)* | Optional, change default |
| `INITIAL_ADMIN_NAME` | `FitChef Admin` | Optional |

**Do not set `PORT`** — Render sets it automatically.

### 4. Deploy

- Click **Create Web Service**. Render will build and deploy.
- After the first successful deploy, open **Shell** (in the service page) and run once:
  ```bash
  npm run db:init
  npm run db:consultations
  npm run db:admin
  npm run db:seed-admin
  ```

### 5. URLs

- **Site:** `https://<your-service-name>.onrender.com`
- **Admin:** `https://<your-service-name>.onrender.com/admin`

---

## Post-deploy

- **Free tier:** Service may spin down after inactivity; first request can be slow.
- **HTTPS:** Render provides it by default.
- **Admin:** Change `INITIAL_ADMIN_PASSWORD` (or set it on first deploy) and use a strong `JWT_SECRET`.

## Troubleshooting

### Consultation form shows "Something went wrong" on live

1. **Use Render’s database URL, not localhost**  
   The Web Service must use the **Internal Database URL** from your Render Postgres, not a URL with `localhost`.
   - In Render: open your **PostgreSQL** service → **Info** (or **Connect**) → copy **Internal Database URL** (looks like `postgresql://user:pass@dpg-xxxxx.oregon-postgres.render.com/dbname`).
   - In your **Web Service** → **Environment** → set `DATABASE_URL` to that Internal URL.  
   Do **not** use `postgresql://...@localhost:5432/...` for the live app; that only works on your machine.

2. **Create tables on the Render database**  
   The `consultations` table must exist in the **Render** Postgres. In the Web Service → **Shell** tab, run once:
   ```bash
   npm run db:init
   npm run db:consultations
   npm run db:admin
   npm run db:seed-admin
   ```
   Then submit the consultation form again.

- **“Something went wrong” on form submit:** Run the four DB commands in Shell (see above) and ensure `DATABASE_URL` is the Render Internal URL.
- **Admin login fails:** Ensure `JWT_SECRET` is set and you ran `npm run db:seed-admin`.
- **Build fails:** Check **Logs** for the build step; ensure Node version is supported (e.g. 18+). You can set **Environment** → `NODE_VERSION` = `18` if needed.

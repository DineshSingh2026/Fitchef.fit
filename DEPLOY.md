# FitChef.fit – Deployment

## Prerequisites

- **Node.js** >= 18
- **PostgreSQL** (e.g. Render, Neon, Supabase, or your own)

## Environment variables

Set these in your host (Render, Railway, etc.) or in `.env` (do **not** commit `.env`):

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default 3000). Hosts often set this automatically. |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | **Yes** (for admin) | Long random string for JWT signing. Use a strong value in production. |
| `NODE_ENV` | No | Set to `production` on deploy. |
| `INITIAL_ADMIN_EMAIL` | No | First admin email (default `admin@fitchef.fit`). |
| `INITIAL_ADMIN_PASSWORD` | No | First admin password (default `Admin@123`). Change in production. |
| `INITIAL_ADMIN_NAME` | No | Admin display name. |

## Deploy steps

1. **Clone and install**
   ```bash
   git clone <your-repo-url>
   cd fitchef-fit   # or your folder name
   npm install
   ```

2. **Database (one-time or after schema changes)**
   ```bash
   npm run db:init           # early_access table
   npm run db:consultations  # consultations table
   npm run db:admin          # admin tables (admin_users, admin_leads, etc.)
   npm run db:seed-admin     # create first admin user
   ```

3. **Start**
   ```bash
   npm start
   ```
   The host usually sets `PORT` and `NODE_ENV=production`.

## Post-deploy

- **Site:** `https://yourdomain.com`
- **Admin:** `https://yourdomain.com/admin` (login with your admin credentials)
- Use **HTTPS** and a strong **JWT_SECRET** and admin password.

## Git

- Do **not** commit `.env` or `node_modules`. Use `.env.example` as a template.
- After pushing to your git repo, connect the repo to your host and set the environment variables there.

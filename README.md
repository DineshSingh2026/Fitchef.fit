# FitChef.fit – Where Gourmet Meets Wellness

Full-stack production-ready website: **HTML5, CSS3, Vanilla JavaScript** frontend with **Node.js, Express, PostgreSQL** backend. MVC architecture, deployment-ready for Render.

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JS (no frameworks)
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Architecture:** MVC (routes, controllers, models, config)

## Quick Start

```bash
npm install
npm start
```

Server runs on `http://localhost:3000` (or `PORT` from env). Static files are served from `public/`.

## Environment Variables

Copy `.env.example` to `.env` and set:

| Variable       | Description                    | Example (local) |
|----------------|--------------------------------|-----------------|
| `PORT`         | Server port                    | `3000`          |
| `DATABASE_URL` | PostgreSQL connection string   | `postgresql://user:pass@localhost:5432/fitchef_db` |

On **Render**, set `DATABASE_URL` and `PORT` in the service **Environment** tab (Render provides `DATABASE_URL` when you add a PostgreSQL instance).

## Database Setup

Create the `early_access` table in your PostgreSQL database (local or Render).

**Option 1 – SQL file (e.g. from Render Shell or `psql`):**

```bash
# If you have psql and DATABASE_URL set:
psql $DATABASE_URL -f scripts/init-db.sql
```

**Option 2 – Run the SQL manually** (see `scripts/init-db.sql` and `scripts/init-consultations.sql` for full DDL).

## Deploying to Render

1. **New Web Service**
   - Connect your repo.
   - Build command: `npm install` (or leave default).
   - Start command: `npm start`.
   - Set **Environment**: `PORT` (Render often sets this automatically), `DATABASE_URL` from your Render PostgreSQL instance.

2. **PostgreSQL**
   - Create a PostgreSQL instance in Render and copy the **Internal Database URL** (or External if your app is outside Render).
   - Add it as `DATABASE_URL` in the Web Service environment.
   - Run the DB scripts once (e.g. via Render Shell or local `psql` with the same URL):
- `scripts/init-db.sql` – early_access table
- `scripts/init-consultations.sql` – consultations table (Personalized Nutrition Concierge form)

3. **Optional:** Add a **Procfile** only if you need a custom process type; for `npm start` it’s not required.

## Project Structure

```
├── server.js              # Express app entry
├── config/
│   └── database.js        # PostgreSQL pool (uses DATABASE_URL)
├── routes/
│   ├── earlyAccess.js      # POST /api/early-access
│   └── consultation.js     # POST /api/consultation
├── controllers/
│   ├── earlyAccessController.js
│   └── consultationController.js
├── models/
│   ├── earlyAccessModel.js
│   └── consultationModel.js
├── public/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── script.js
├── scripts/
│   ├── init-db.sql           # early_access table
│   └── init-consultations.sql # consultations table
├── .env.example
└── package.json
```

## API

### POST /api/early-access
- Body: `{ "email": "user@example.com" }`
- Validates email, inserts into `early_access`, returns JSON.
- Success: `201` with message *"You're on the list. Welcome to refined wellness."*
- Duplicate email: `409` with message *"This email is already on the list. Welcome back!"*

### POST /api/consultation
- Body: JSON with required `full_name`, `email`, `city`; optional `phone`, `delivery_frequency`, `goals` (array), `age`, `gender`, `height`, `weight`, `activity_level`, `diet_type`, `allergies`, `spice_preference`, `start_timeline`.
- Success: `201` with `{ "success": true, "message": "Consultation submitted successfully" }`.
- Error: `400` for validation errors, `500` for server errors.

**Sample test (curl):**
```bash
curl -X POST http://localhost:3000/api/consultation \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Jane Doe","email":"jane@example.com","city":"Hyderabad"}'
```

## License

MIT.

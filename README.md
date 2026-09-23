# billing-whatsapp

Full-stack billing application with a Laravel API backend, a React + Vite frontend, and a Node.js (Baileys) WhatsApp messaging service.

## Project structure

```
billing-whatsapp/
├── billing_software_backend/    Laravel PHP backend (REST API)
├── billing_software_frontend/   React + Vite frontend (SPA)
└── whatsapp-service/            Node.js + Baileys WhatsApp service
```

- **Backend** serves the REST API, stores uploaded files (e.g. `/storage` uploads), and can broadcast real-time events via Laravel Reverb.
- **Frontend** talks to the backend through `VITE_API_URL` (see `src/services/api.js`).
- **WhatsApp service** handles WhatsApp login (QR code / linked devices) and message sending; it calls back into the Laravel API using a shared internal token.

## Required software

| Software | Version suggestion | Used by |
|---|---|---|
| PHP | 8.2+ | Backend |
| Composer | 2.x | Backend |
| MySQL / MariaDB | 8.x / 10.x | Backend |
| Node.js | 18+ | Frontend, WhatsApp service |
| npm | 9+ | Frontend, WhatsApp service |
| Chromium / Chrome (optional) | latest | WhatsApp service (QR preview rendering) |

## 1. Laravel backend setup

```bash
cd billing_software_backend
composer install
cp .env.example .env
php artisan key:generate
# Create your database (e.g. smart_billing), then fill DB_* values in .env
php artisan migrate
php artisan storage:link
php artisan serve            # http://localhost:8000
```

Real-time (Reverb) is optional for local development:

```bash
php artisan reverb:start     # ws://localhost:8080
```

## 2. React frontend setup

```bash
cd billing_software_frontend
npm install
cp .env.example .env         # set VITE_API_URL (default works for local Laravel)
npm run dev                  # http://localhost:5173
npm run build                # production build in dist/
```

## 3. WhatsApp service setup

```bash
cd whatsapp-service
npm install
cp .env.example .env         # set LARAVEL_API_URL + LARAVEL_API_KEY
npm start                    # http://localhost:3001
```

Login flow is QR-based (Baileys). Session data is written to `SESSION_PATH` (default `./sessions`) and must never be committed to Git.

## Environment variables

### Backend — `billing_software_backend/.env`

| Variable | Purpose |
|---|---|
| `APP_KEY` | Laravel encryption key (`php artisan key:generate`) |
| `APP_ENV` / `APP_DEBUG` | Set `production` / `false` in production |
| `APP_URL` | Public backend URL (used for storage links) |
| `DB_*` | MySQL connection |
| `SESSION_*` / `CACHE_STORE` / `QUEUE_CONNECTION` | Session/cache/queue drivers |
| `MAIL_*` | SMTP credentials |
| `REVERB_*` | WebSocket broadcasting |
| `WHATSAPP_SERVICE_URL` | URL of the WhatsApp service |
| `WHATSAPP_INTERNAL_TOKEN` | Shared secret between backend and WhatsApp service (must match the service's `LARAVEL_API_KEY`) |

### Frontend — `billing_software_frontend/.env`

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base, e.g. `http://localhost:8000/api/` (production: `https://YOUR_BACKEND_DOMAIN/api/`) |
| `VITE_API_URL_IMAGE` | Optional override for the uploaded-files root (defaults to `VITE_API_URL` minus `/api/`) |
| `VITE_REVERB_APP_KEY` / `VITE_REVERB_HOST` / `VITE_REVERB_PORT` | WebSocket client config |

### WhatsApp service — `whatsapp-service/.env`

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (default `3001`) |
| `LARAVEL_API_URL` | Laravel backend URL |
| `LARAVEL_API_KEY` | Shared internal token (must match backend `WHATSAPP_INTERNAL_TOKEN`) |
| `SESSION_PATH` | Baileys session directory — **keep on persistent storage** |
| `BAILEYS_LOG_LEVEL` | Baileys log verbosity (default `silent`) |
| `CHROME_PATH` | Optional explicit Chromium path |

## Local development (all three at once)

```bash
# Terminal 1 — backend
cd billing_software_backend && php artisan serve

# Terminal 2 — frontend
cd billing_software_frontend && npm run dev

# Terminal 3 — WhatsApp service
cd whatsapp-service && npm start
```

## Production deployment notes

- **Backend**: set `APP_ENV=production`, `APP_DEBUG=false`, a real `APP_URL`; run `composer install --no-dev --optimize-autoloader`, `php artisan config:cache route:cache view:cache`, `php artisan storage:link`. Never run `migrate:fresh` against production data.
- **Frontend**: build with the production API URL baked in (`VITE_API_URL=https://YOUR_BACKEND_DOMAIN/api/`) and serve the `dist/` folder via Nginx/Apache/CDN.
- **WhatsApp service**: run under a process manager (pm2/systemd); mount `SESSION_PATH` on a **persistent volume** so WhatsApp sessions survive restarts and redeploys. Never store sessions inside the Git repository.
- **Secrets**: configure all secrets via environment files on the server (`.env` files are ignored by Git). Rotate any credential that may have been exposed previously.
- **CORS**: `config/cors.php` currently allows all origins (`*`); restrict `allowed_origins` to your real frontend domain in production.

## Security

- `.env` files, WhatsApp session directories, logs, uploads and dependencies are Git-ignored — see the root `.gitignore`.
- `.env.example` files contain variable names with safe placeholder values only.

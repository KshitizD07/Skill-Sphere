# SkillSphere — Pre-Launch Audit & Deployment Guide

> Generated: 2026-05-09

---

## ✅ Issues Found & Fixed

The following bugs and gaps were identified and corrected automatically.

### 1. `server/.env` — Missing Variables
**Problem:** Three variables used throughout the codebase were completely absent from `.env`, causing silent runtime defaults or crashes.

| Missing Variable | Effect | Fixed |
|---|---|---|
| `NODE_ENV` | Defaulted to `undefined`; error messages leaked stack traces in prod | ✅ Added |
| `JWT_EXPIRES_IN` | Auth tokens used hardcoded `'7d'` fallback | ✅ Added |
| `ALLOWED_ORIGINS` | CORS allowed origins defaulted to localhost only | ✅ Added |

---

### 2. `server/.env.example` — Real Secrets Exposed
**Problem:** The example file contained **live credentials** — a real GitHub token, a real Google API key, and real SMTP credentials. This file would be committed to version control and is **a critical security risk**.

**Fixed:** Replaced all real values with safe placeholders:
- `GITHUB_TOKEN=your-github-personal-access-token`
- `GOOGLE_API_KEY=your-google-gemini-api-key`
- `SMTP_USER=your-email@gmail.com`
- `SMTP_PASS=your-gmail-app-password`

> [!CAUTION]
> **Your tokens are already exposed.** Because `.env.example` contained real credentials and was committed to git, you must rotate them immediately:
> 1. **GitHub Token** → github.com → Settings → Developer Settings → Personal Access Tokens → Delete old token → Generate new one
> 2. **Google API Key** → aistudio.google.com → Manage API keys → Delete old key → Create new one
> 3. **Gmail App Password** → myaccount.google.com → Security → App passwords → Revoke old one → Create new one

---

### 3. `server/.gitignore` — Incorrectly Ignoring `.env.example`
**Problem:** The server `.gitignore` had `.env.example` listed, which would prevent the template file from being committed — defeating its entire purpose.

**Fixed:** Removed `.env.example` from the ignore list. Also added:
- `/logs/` — PM2/Winston log directory
- `*.log` — individual log files

---

### 4. `client/src/config/constants.js` — Hardcoded `localhost` API URL
**Problem:** `API_BASE_URL` was hardcoded to `http://localhost:5001/api`. Any production build would call `localhost` instead of the live server.

**Fixed:** Now reads from Vite env variable:
```js
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
export const SOCKET_URL   = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
```

---

### 5. `client/vite.config.js` — Build Options in Wrong Location
**Problem:** `minify`, `chunkSizeWarningLimit`, and `sourcemap` were placed at the top level of `defineConfig()`. Vite only reads these inside a `build: {}` block — they were silently ignored, meaning production builds were not optimised.

**Fixed:** Moved them inside `build: {}`:
```js
build: {
  minify: 'esbuild',
  chunkSizeWarningLimit: 700,
  sourcemap: false,
}
```

---

### 6. Socket.io Connections Using Wrong Env Variable
**Problem:** `NotificationBell.jsx`, `ChatInterface.jsx`, and `DashboardChat.jsx` connected socket.io using `VITE_API_URL` (which has a `/api` suffix). Socket.io must connect to the base server URL, not the API sub-path.

**Fixed:** All three now use `VITE_SOCKET_URL` (which correctly points to the server root).

---

### 7. `client/.gitignore` — Wrong Files Ignored
**Problem:** The client `.gitignore` was ignoring two source files that must be tracked:
- `vite.config.js` — required for every build
- `/public` — contains static assets (favicon, etc.)

Also missing: `.env.local` and `.env.*.local` exclusions.

**Fixed:** Removed the bad entries, added proper env exclusions.

---

### 8. No Root `.gitignore`
**Problem:** The repository root had no `.gitignore`, meaning `node_modules/`, `.env` files, `dist/`, and logs at the root level were not excluded from version control.

**Fixed:** Created `/.gitignore` at the repo root.

---

### 9. No Client `.env.example`
**Problem:** There was no template telling contributors (or your hosting platform) which env variables the frontend needs.

**Fixed:** Created `client/.env.example` with `VITE_API_URL` and `VITE_SOCKET_URL`.

---

## 🚀 Production Deployment Checklist

### Before Deploying

- [ ] **Rotate all exposed credentials** (see Issue #2 above — CRITICAL)
- [ ] Set a strong, random `JWT_SECRET` — run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] Confirm your production `DATABASE_URL` points to your hosted PostgreSQL (Supabase, Railway, Neon, etc.)
- [ ] Run Prisma migrations: `npx prisma migrate deploy`
- [ ] Run Prisma generate: `npx prisma generate`

---

### Backend Deployment (e.g. Railway / Render / VPS)

Set these environment variables in your hosting platform's dashboard:

```env
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://...        # your hosted DB
JWT_SECRET=<64-byte-random-hex>
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=https://your-frontend.vercel.app
REDIS_URL=rediss://...               # optional but recommended for prod
GITHUB_TOKEN=ghp_...                 # your new token
GOOGLE_API_KEY=AIza...               # your new key
SMTP_USER=your@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
```

Start with PM2:
```bash
cd server
npm install --production
npx prisma generate
npx prisma migrate deploy
npm run prod
# or: pm2 start pm2.config.cjs --env production
```

---

### Frontend Deployment (Vercel / Netlify)

Set these environment variables in your hosting platform's dashboard:

```env
VITE_API_URL=https://your-api-domain.com/api
VITE_SOCKET_URL=https://your-api-domain.com
```

Build command: `npm run build`  
Output directory: `dist`

```bash
cd client
npm install
npm run build
# Deploy the dist/ folder
```

---

### Quick Local Start (after cloning)

```bash
# 1. Server
cd server
cp .env.example .env         # fill in your values
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# 2. Client (separate terminal)
cd client
cp .env.example .env.local   # fill in your values
npm install
npm run dev
```

---

## 📋 Environment Variable Reference

### Server (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP port (default: 5001) |
| `NODE_ENV` | Yes | `development` or `production` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | Secret for signing JWTs — must be long & random |
| `JWT_EXPIRES_IN` | No | Token lifetime (default: `7d`) |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins (default: localhost) |
| `REDIS_URL` | No | Redis connection string — falls back to in-memory cache |
| `GITHUB_TOKEN` | No | GitHub PAT — without it: 60 req/hour limit |
| `GOOGLE_API_KEY` | No | Gemini AI key — required for AI roadmap feature |
| `SMTP_USER` | No | Gmail address for outgoing emails |
| `SMTP_PASS` | No | Gmail App Password (not your account password) |

### Client (`client/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | **Yes** | Full URL to the backend API e.g. `https://api.example.com/api` |
| `VITE_SOCKET_URL` | **Yes** | Base URL for socket.io e.g. `https://api.example.com` |

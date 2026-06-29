# ToolsWala 🛠️

A free, modern, multi-tool web platform where every tool runs in complete isolation.
Built on Cloudflare Pages + Workers (free) and Render (free backends).

📐 **Design/front-end spec:** see [`UI_UX_REQUIREMENTS.md`](./UI_UX_REQUIREMENTS.md) —
the color/type system, Tailwind + Motion setup, motion guidelines, accessibility and
performance bar, and the Cloudflare Pages free-tier checklist for the front end.
Read that before building any page. This README stays focused on architecture/infra.

---

## 🏗️ Architecture Overview

```
User Browser
    ↓
Cloudflare Pages (frontend - HTML/CSS/JS)        [FREE]
    ↓
Cloudflare Worker (API gateway - routes only)    [FREE]
    ↓
Individual Render Backends (per tool)            [FREE]
    ↓
Cloudflare D1 (database)                         [FREE]
```

**Core principle:** Every tool has its own isolated backend.
If QR backend crashes → PDF tool still works perfectly.

---

## 📁 Project Structure

```
toolswala/
│
├── frontend/                        ← Cloudflare Pages deploys this
│   ├── index.html                   ← Homepage (lists all tools)
│   ├── sitemap.xml                  ← SEO - tells Google all your pages
│   ├── robots.txt                   ← SEO - crawler instructions
│   ├── _redirects                   ← Routes /api/* to Cloudflare Worker
│   ├── _headers                     ← Cache-Control rules for CSS/JS/fonts
│   ├── package.json                 ← devDependencies: tailwindcss, @tailwindcss/cli
│   │
│   ├── data/
│   │   └── tools.json               ← Single source of truth: every tool's name/slug/icon/blurb
│   │
│   ├── assets/
│   │   ├── css/
│   │   │   ├── input.css            ← Tailwind source + design tokens (@theme block)
│   │   │   └── main.css             ← COMPILED output — built by `npx @tailwindcss/cli`, don't hand-edit
│   │   ├── fonts/                   ← Self-hosted .woff2 (Space Grotesk, IBM Plex Sans, IBM Plex Mono)
│   │   └── js/
│   │       ├── shared.js            ← Shared utilities (fetch wrapper, error handler)
│   │       ├── motion.js            ← Thin wrapper around the Motion animation library
│   │       └── command-palette.js   ← The "/" / Cmd+K tool launcher (see UI_UX_REQUIREMENTS.md §4)
│   │
│   ├── components/
│   │   └── navbar.html              ← Reusable navbar snippet, includes the search/command trigger
│   │
│   └── tools/
│       ├── qr-generator/
│       │   ├── index.html           ← QR tool UI (Tailwind classes, shared main.css)
│       │   └── app.js               ← Calls /api/qr/* only
│       │
│       └── pdf-edit/
│           ├── index.html           ← PDF tool UI (Tailwind classes, shared main.css)
│           └── app.js               ← Calls /api/pdf/* only
│
├── worker/                          ← Cloudflare Worker (API gateway)
│   ├── wrangler.toml                ← Worker config (THE most important file)
│   ├── package.json
│   └── src/
│       └── index.js                 ← Router: reads URL → forwards to right backend
│
├── backends/                        ← Each tool's isolated server (deployed to Render)
│   ├── qr-api/
│   │   ├── app.py                   ← Flask app for QR generation
│   │   ├── requirements.txt
│   │   └── render.yaml              ← Tells Render how to deploy this service
│   │
│   └── pdf-api/
│       ├── app.py                   ← Flask app for PDF text extraction
│       ├── requirements.txt
│       └── render.yaml
│
├── database/
│   └── schema.sql                   ← D1 database table definitions
│
├── .github/
│   └── workflows/
│       └── deploy.yml               ← Auto-deploy on git push (optional)
│
├── .gitignore
└── README.md                        ← This file
```

---

## 🚀 Setup Guide (Step by Step)

### Prerequisites
- Node.js installed (for Wrangler)
- Python 3.11+ installed (for local backend testing)
- Git installed
- Cloudflare account (free) → https://cloudflare.com
- Render account (free) → https://render.com
- GitHub account (free) → https://github.com

---

### Step 1 — Install Wrangler (Cloudflare CLI)

```bash
npm install -g wrangler
wrangler login
# Opens browser → log in with your Cloudflare account
```

---

### Step 2 — Create D1 Database

```bash
cd worker/
wrangler d1 create toolswala-db
```

Copy the `database_id` it gives you and paste it into `worker/wrangler.toml`.

Then create the tables:
```bash
wrangler d1 execute toolswala-db --file=../database/schema.sql
```

---

### Step 3 — Set Secret Token (Security)

This token prevents anyone from hitting your backends directly.

```bash
cd worker/
wrangler secret put INTERNAL_TOKEN
# It will prompt you to type the secret value
# Use any long random string e.g: toolswala-secret-xk29dma82lqp
```

Also set the same token in each Render backend as an environment variable named `INTERNAL_TOKEN`.

---

### Step 4 — Deploy Backends to Render

1. Push this entire repo to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Set root directory to `backends/qr-api`
5. Render auto-reads `render.yaml` and deploys
6. Copy the live URL e.g: `https://qr-api.onrender.com`
7. Repeat for each backend

---

### Step 5 — Add Backend URLs to Worker

Open `worker/wrangler.toml` and fill in your Render URLs:

```toml
[vars]
QR_BACKEND = "https://qr-api.onrender.com"
PDF_BACKEND = "https://pdf-api.onrender.com"
```

---

### Step 6 — Deploy the Worker

```bash
cd worker/
wrangler deploy
```

Your Worker is now live at: `https://toolswala-gateway.workers.dev`

---

### Step 7 — Deploy Frontend to Cloudflare Pages

1. Go to Cloudflare Dashboard → Pages → Create a project
2. Connect your GitHub repo
3. Build settings:
   - Build command: `npm install && npx @tailwindcss/cli -i ./frontend/assets/css/input.css -o ./frontend/assets/css/main.css --minify`
   - Build output directory: `frontend`
4. Deploy → your site is live at: `https://toolswala.pages.dev`

This still deploys as a fully static site — the build step only compiles Tailwind's
CSS, it doesn't add a server. Builds finish in seconds (Pages allows up to 20 minutes
on the free plan) and each push counts as one of your 500 free builds/month.
See [`UI_UX_REQUIREMENTS.md`](./UI_UX_REQUIREMENTS.md) §2 for the full front-end build setup.

---

### Step 8 — Submit to Google Search Console

1. Go to https://search.google.com/search-console
2. Add your domain
3. Submit `https://toolswala.pages.dev/sitemap.xml`

---

## 🔄 How to Add a New Tool

Adding a new tool never touches any existing tool. Follow this pattern:

```
1. Create  frontend/tools/new-tool/index.html  (Tailwind classes, follows UI_UX_REQUIREMENTS.md)
2. Create  frontend/tools/new-tool/app.js
3. Add the tool to frontend/data/tools.json     (powers the homepage grid + command palette)
4. Create  backends/new-tool-api/app.py
5. Create  backends/new-tool-api/requirements.txt
6. Create  backends/new-tool-api/render.yaml
7. Add 3 lines to worker/src/index.js  (new route)
8. Add 1 line to worker/wrangler.toml  (new backend URL)
9. Deploy new backend to Render
10. Run: wrangler deploy  (updates the worker)
11. Push frontend to GitHub (Pages rebuilds Tailwind + redeploys automatically)
12. Add new URL to sitemap.xml
```

Existing tools are **never touched or redeployed**. A tool-specific `style.css` is
no longer needed for new tools — style with Tailwind utility classes against the
tokens in `UI_UX_REQUIREMENTS.md` §1 instead, so every page stays visually consistent
without copy-pasted CSS.

---

## 🔒 Security Checklist

- [ ] `INTERNAL_TOKEN` set via `wrangler secret put` (not in wrangler.toml)
- [ ] `INTERNAL_TOKEN` set in each Render backend environment variables
- [ ] CORS locked to your domain only in each Flask app
- [ ] File size limits set in each Flask app
- [ ] Rate limiting added to Worker
- [ ] Security headers added to Worker responses

---

## 🛠️ Useful Wrangler Commands

```bash
wrangler dev                          # Test worker locally
wrangler deploy                       # Deploy worker to production
wrangler tail                         # Watch live request logs
wrangler secret put SECRET_NAME       # Add encrypted secret
wrangler d1 create mydb               # Create new D1 database
wrangler d1 execute mydb --file=x.sql # Run SQL on D1
wrangler d1 execute mydb --command "SELECT * FROM tools"  # Quick query
```

---

## 📊 Free Tier Limits

| Service | Free Limit | Notes |
|---|---|---|
| Cloudflare Pages | Unlimited requests | 500 builds/month, 20-minute build timeout (the Tailwind compile takes seconds) |
| Cloudflare Workers | 100,000 req/day | Resets daily |
| Cloudflare D1 | 5GB, 25M reads/day | Very generous |
| Render (per backend) | 750 hours/month | Sleeps after 15min idle |

**Render sleep note:** Free backends sleep after 15 minutes of no traffic.
First request after sleep takes ~30 seconds. This is the single biggest UX risk in
the project — handle it with an explicit "waking up" state, not a bare spinner.
See [`UI_UX_REQUIREMENTS.md`](./UI_UX_REQUIREMENTS.md) §4 for the exact requirement.
Optional: use a free uptime monitor to ping it every 10 minutes.

---

## 🌐 Live URLs (fill in as you deploy)

| Service | URL |
|---|---|
| Frontend | https://toolswala.pages.dev |
| Worker | https://toolswala-gateway.workers.dev |
| QR Backend | https://qr-api.onrender.com |
| PDF Backend | https://pdf-api.onrender.com |

---

## 📦 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | HTML + Tailwind CSS (compiled, no runtime) + Vanilla JS | Modern, fast to style, still no SPA framework — every tool page stays an independent file |
| Motion | Motion (`motion` on npm — formerly Framer Motion, now framework-free) | Same animation engine as Framer Motion, without requiring React |
| CDN/Hosting | Cloudflare Pages | Free, global, instant cache |
| API Gateway | Cloudflare Workers | Free, runs at edge, routes traffic |
| Database | Cloudflare D1 | Free SQLite, lives inside Cloudflare |
| Backends | Python + Flask | Simple, your existing code works |
| Backend Hosting | Render | Free tier, auto-deploy from GitHub |

Full design system, motion rules, accessibility and performance bar:
[`UI_UX_REQUIREMENTS.md`](./UI_UX_REQUIREMENTS.md).

# 💿 Album Finder

[![Live Demo](https://img.shields.io/badge/Live_Demo-1ED760?style=for-the-badge&logo=vercel&logoColor=white)](https://albumfinder-app.vercel.app)

Search any musical artist and browse their full discography — cover art,
release types, tracklists, and links straight to Spotify — in a fast,
keyboard-friendly UI that adapts to light and dark mode.

Built with **React 18 + Vite** on the frontend and a tiny **Express** backend
that handles the Spotify token exchange, so no API secret ever reaches the
browser.

---

## ✨ Features

- **Artist search** — type a name and get their top matching artist, photo,
  and full release list in one request. Try-it suggestion chips (Radiohead,
  Kendrick Lamar, Daft Punk, and more) make the empty state useful.
- **Filter by release type** — toggle **Albums**, **Singles & EPs**, and
  **Compilations** independently; results refetch instantly as you change the
  selection (at least one type always stays active).
- **Sort control** — order releases **Newest first**, **Oldest first**, or
  **Title A–Z**.
- **Album detail modal** — click any release to see its full, paginated
  tracklist with track numbers (disc-aware for multi-disc albums), duration,
  explicit tags, per-track Spotify links, label, and release year. Closes on
  `Esc` or backdrop click.
- **Shareable search URLs** — a search sets `?q=` in the address bar, so
  results can be bookmarked or shared and reload on first visit.
- **Loading, empty, and error states** — animated skeleton cards while
  fetching, a friendly empty state when nothing matches, and a retry button
  if a request fails.
- **Light & dark mode** — follows the OS/browser color scheme automatically,
  with a Spotify-green accent in both themes.
- **Responsive, accessible UI** — fluid album grid, keyboard-navigable
  controls, `aria` labels throughout, and reduced-motion support.
- **Resilient backend** — caches the Spotify access token and recent search
  results in memory, retries once on `429` rate limits (respecting
  `Retry-After`), transparently paginates artist albums and album tracklists,
  and de-duplicates repeat releases (e.g. same album across markets).

## 🧱 Tech stack

| Layer    | Stack |
| -------- | ----- |
| Frontend | React 18, Vite 5, plain CSS (CSS variables for theming) |
| Backend  | Node.js, Express — Spotify Client Credentials flow |
| Data     | [Spotify Web API](https://developer.spotify.com/documentation/web-api) |
| Tooling  | ESLint (`eslint:recommended` + React/Hooks rules), Concurrently |

## 🚀 Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Add Spotify credentials

Create an app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard),
then copy the template and fill in your values:

```bash
cp .env.example .env
```

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

> `.env` is gitignored — never commit real credentials. The server reads
> them via the Client Credentials flow, so no user login or redirect URI is
> required.

### 3. Run it

```bash
npm run dev
```

This starts the API server (`localhost:3001`) and the Vite dev server
together. Open the URL Vite prints (default <http://localhost:5173>) — Vite
proxies `/api/*` requests to the API server for you.

## 📜 Scripts

| Script                | Purpose                                  |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | API + client together, with hot reload    |
| `npm run dev:client`   | Vite dev server only                      |
| `npm run dev:server`   | API server only (`node --watch`)          |
| `npm run build`        | Production build of the client → `dist/`  |
| `npm start`            | Run the API server (production)           |
| `npm run lint`         | ESLint over the whole project             |

## 🔌 API reference

The Express server exposes a small JSON API consumed by the React app.

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | `{ ok, spotifyConfigured }` — quick check that credentials are set. |
| `GET /api/search?q=<artist>&groups=<types>` | Resolves the best-matching artist for `q` and returns their releases. `groups` is a comma-separated subset of `album,single,compilation,appears_on` (defaults to `album,single`). Response: `{ artist, groups, albums[] }`. |
| `GET /api/album/:id` | Full detail for one album, including the complete tracklist. |

Responses are cached in memory for 10 minutes per query to stay well under
Spotify's rate limits, and a `429` from Spotify is retried once automatically
before being surfaced to the client.

## 📁 Project structure

```
Album Finder/
├─ api/
│  └─ index.js       # Vercel serverless function entry (wraps server/app.js)
├─ server/
│  ├─ app.js          # Express app + all /api routes (shared by both entry points)
│  ├─ index.js        # Local dev / single-service entry: app.js + static dist/ + listen()
│  ├─ spotify.js       # Spotify API client: auth, search, albums, caching
│  └─ load-env.js      # Minimal .env loader (no external dependency)
├─ src/
│  ├─ App.jsx         # UI: search, filters, sort, album grid, detail modal
│  ├─ App.css          # Component styles
│  ├─ index.css        # Theme tokens (light/dark) & resets
│  └─ main.jsx          # React entry point
├─ public/             # Static assets (favicon)
├─ index.html
├─ vite.config.js       # Dev server + /api proxy
├─ vercel.json           # Routes /api/* to the serverless function
└─ .env.example
```

## 🛫 Deploying

The API routes live in [`server/app.js`](server/app.js) and are shared by two
entry points, so the same backend logic runs unmodified on either platform:

### Vercel (recommended)

1. Import this repo at [vercel.com/new](https://vercel.com/new) — the Vite
   frontend is auto-detected and built (`vite build` → `dist/`), and
   [`api/index.js`](api/index.js) deploys as a serverless function.
   [`vercel.json`](vercel.json) rewrites every `/api/*` request to that
   function, which resolves the sub-route internally.
2. In the project's **Settings → Environment Variables**, add
   `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
3. Deploy. No other configuration needed.

### Render / Railway / any Node host (single service)

1. **Build command:** `npm install && npm run build`
2. **Start command:** `npm start` — runs [`server/index.js`](server/index.js),
   which serves the built `dist/` folder *and* the API from one process on
   `PORT` (default `3001`).
3. Set `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` as real environment
   variables (the built-in `.env` loader is a local-dev convenience and is
   skipped if the file isn't present).

## 📄 License

[MIT](LICENSE) © Mazhar Sourav

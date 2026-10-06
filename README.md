# SafeTour 360

Intelligent Tourist Safety & Incident Response Platform.

SafeTour 360 helps tourists share location, raise SOS alerts, report incidents,
and carry a verifiable Digital ID. Admins monitor alerts, incidents, geofences,
and simple analytics. Risk scores are produced by an explainable **rules-based**
engine (not machine learning). Digital IDs use a **hashed token + QR verification
URL** (not blockchain).

## Features

- Tourist registration and JWT login (public signup is always tourist)
- Role-protected tourist and admin dashboards
- Browser geolocation with Leaflet / OpenStreetMap
- Radius geofences and danger-zone warnings
- Database-backed SOS lifecycle and incident reporting
- Explainable risk level with reasons
- Digital ID issue, revoke, QR, and public verify page
- Socket.IO live SOS/incident updates after REST + MongoDB
- Admin analytics (tourists, SOS, incidents, high/critical risk)

## Architecture

- `client/` — React + Vite + TypeScript SPA
- `server/` — Express + TypeScript API, Mongoose models, Socket.IO
- MongoDB is optional at startup; database actions return HTTP 503 until
  `MONGODB_URI` is connected. The API never fakes a successful write.

## Tech stack

React, Vite, TypeScript, Express, MongoDB/Mongoose, JWT, bcrypt, Leaflet,
OpenStreetMap, Socket.IO, QRCode.

## Local setup

From the project root:

```bash
npm install
```

Copy `server/.env.example` to `server/.env` and set at least:

```
MONGODB_URI=mongodb://127.0.0.1:27017/safetour360
JWT_SECRET=change-this-to-a-long-random-string
FRONTEND_URL=http://localhost:5000
PUBLIC_APP_URL=http://localhost:5000
```

Optional:

- `CORS_ORIGINS` — comma-separated allowed origins (defaults to `FRONTEND_URL`)
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` — used only by the first-admin script

Do not commit `server/.env`.

## Run

```bash
npm run dev:server
npm run dev:client
```

- Client: port `5000` (proxies `/api` and `/socket.io` to the API)
- API: port `8000`
- Health: `GET /api/health`

Without MongoDB the server still starts; register/login/SOS/incidents return 503.

## MongoDB

Install a local MongoDB instance or use MongoDB Atlas. Paste the connection
string into `MONGODB_URI`. Until that connection succeeds, dashboards show the
503 message instead of dummy success data.

### First admin

There is no public admin registration. After MongoDB and `JWT_SECRET` are set:

```bash
npm run create-admin
```

The script refuses to create a second admin.

## Demo flow

1. Register a tourist at `/register`, then log in at `/login`.
2. Open `/tourist`, allow browser location, and confirm the map.
3. As admin, add a danger zone using the tourist’s coordinates.
4. Tourist sees the danger warning and a rules-based risk level with reasons.
5. Tourist presses SOS; the alert is stored in MongoDB.
6. Admin `/admin` sees the SOS, then Acknowledge / Responding / Resolve.
7. Tourist status updates (REST refresh and Socket.IO if connected).
8. Tourist reports an incident; admin views and updates it.
9. Tourist generates a Digital ID QR; `/verify/:token` confirms it.
10. Admin analytics reflect tourists, SOS, incidents, and high/critical risk.

## Checks

```bash
npm run check
```

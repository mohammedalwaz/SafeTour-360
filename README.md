# SafeTour 360

Intelligent Tourist Safety & Incident Response Platform.

SafeTour 360 is being built in phases. The foundation includes a responsive
React client, Express API, and optional MongoDB connection. Phase 2 adds
tourist/admin authentication; GPS, geofencing, SOS, incidents, maps, QR IDs,
analytics, and risk assessment remain out of scope until later phases.

## Requirements

- Node.js 20.19+ (or 22.12+)
- npm
- MongoDB is optional for Phase 1

## Setup

From the project root:

```bash
npm install
```

To configure the backend, copy `server/.env.example` to `server/.env` and set
`MONGODB_URI`. Without a working MongoDB connection, the API starts, but
registration, login, and other database-backed authentication requests return
HTTP 503 rather than pretending to succeed.

Set `JWT_SECRET` in the environment for token signing. The existing Replit
`SESSION_SECRET` is used only as a fallback when `JWT_SECRET` is not set.

## Run in development

Open two terminals from the project root:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

The Vite client runs on port `5000` and proxies `/api` requests to the Express
server on port `8000`. The health endpoint is `GET /api/health`.

Set `FRONTEND_URL` in `server/.env` to the frontend's origin when it differs
from `http://localhost:5000`.

## Authentication

- `POST /api/auth/register` always creates a tourist account, even if the
  request includes a `role` field.
- `POST /api/auth/login` returns a one-hour JWT and basic user information.
- `GET /api/auth/me` returns the authenticated user's basic information.
- `GET /api/tourist/access` and `GET /api/admin/access` demonstrate backend
  role protection.
- Logout is handled in the browser by removing the stored access token.

### Create the first admin

There is no public admin registration route. Set `ADMIN_NAME`, `ADMIN_EMAIL`,
and `ADMIN_PASSWORD` in the local `server/.env` or secure environment settings,
then run:

```bash
npm run create-admin
```

The command refuses to create another admin if one already exists. Do not
commit `server/.env`; it is excluded by `.gitignore`.

## Checks

```bash
npm run check
```

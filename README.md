# SafeTour 360

Intelligent Tourist Safety & Incident Response Platform.

SafeTour 360 is being built in phases. Phase 1 establishes the responsive React
client, Express API, optional MongoDB connection, and project setup. Feature
workflows such as authentication, GPS, SOS, and incident management are not part
of this phase.

## Requirements

- Node.js 20.19+ (or 22.12+)
- npm
- MongoDB is optional for Phase 1

## Setup

From the project root:

```bash
npm install
```

To configure the backend, copy `server/.env.example` to `server/.env`. MongoDB
is optional: without `MONGODB_URI`, the API starts and reports that the database
is not configured.

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

## Checks

```bash
npm run check
```

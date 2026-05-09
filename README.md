# learn_it_backend

Backend API for the Learn It platform — a TypeScript + Express server using Prisma (MongoDB), BullMQ, WebSockets and common integrations (Stripe, Twilio, Firebase).

## Overview

This repository implements the backend services for a mentoring/consultation platform. It provides:

- User and expert profiles
- Session booking, scheduling and availability
- Payment integrations and payouts
- Recording, reporting and reviews
- Real-time messaging (WebSockets)
- Background workers and queues (BullMQ + Redis)

The server is written in TypeScript and organized as a modular Express app under `src/app`.

## Tech Stack

- Node.js + TypeScript
- Express
- Prisma (MongoDB datasource)
- Redis + BullMQ for background jobs
- WebSockets for real-time features
- Firebase Admin, Stripe, Twilio, Moyasar (payment/webhook)

## Key files & folders

- `src/app` — main application code and modules (auth, user, booking, service, availability, recording, etc.)
- `src/server.ts` — process bootstrap, seeds and websocket setup
- `src/app/routes` — API route registrations
- `src/config` — environment-driven configuration and seed scripts
- `prisma/schema.prisma` — Prisma schema (MongoDB models)
- `uploads/` — static uploads served at `/uploads`

## Project structure (high level)

- `src/app/modules` — feature modules: `auth`, `user`, `service`, `booking`, `availability`, `message`, `recording`, `review`, `notifications`, `subscription`, `admin`, `mockSession`, etc.
- `src/app/middlewares` — request validation, auth, error handler
- `src/helpers` — utilities: payments, recording callbacks, email/sms, redis, etc.
- `workers/` — scheduled/background workers started by imports in `server.ts`
- `queues/` — queue processors/definitions

## Routes

Main API root: `/api/v1` with module routes mounted under paths such as `/api/v1/users`, `/api/v1/auth`, `/api/v1/booking`, `/api/v1/service`, etc. Admin Bull board is mounted at `/admin/queues` and is protected with basic auth.

## Environment

Configuration is driven by environment variables (see `src/config/index.ts`). Key variables include:

- `DATABASE_URL` (MongoDB connection)
- `PORT`
- `JWT_SECRET`, `REFRESH_TOKEN_SECRET`
- `BULL_PASSWORD` (admin queue UI)
- External service keys: `MOYASAR_SK`, `STRIPE_*`, `TWILIO_*`, `FIREBASE_*`, `DO_SPACES_*`, email settings, etc.

## Setup & Development

1. Install dependencies

```bash
npm install
```

2. Create a `.env` file with the required variables (see `src/config/index.ts` for keys used).

3. Generate Prisma client (runs automatically on `npm install` via `postinstall`) or manually:

```bash
npx prisma generate
```

4. Run in development mode (auto-restarts):

```bash
npm run dev
```

5. Build and run production bundle:

```bash
npm run build
npm start
```

## Database & Migrations

This project uses Prisma with a MongoDB datasource. The data models are defined in `prisma/schema.prisma`.

## Seeds

`server.ts` triggers `seedSuperAdmin()` and `seedMockInterview()` on startup to ensure basic seed data exists.

## Notes & Operational

- Static uploads are served from the `uploads/` folder at the `/uploads` route.
- Background workers are started via imports in `src/server.ts` (`workers/*`).
- Admin queue UI is available at `/admin/queues` and uses the `BULL_PASSWORD` from config for basic auth.

## Testing & Linting

There are no test scripts configured in `package.json` currently.

## Contributing

If you'd like to contribute, please open an issue or PR. Follow the existing code patterns (TypeScript, zod validations, shared helpers).

## Contact

Project maintained by Mir-Hasan.

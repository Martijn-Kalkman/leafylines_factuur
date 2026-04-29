## LeafyLines Factuur Portal

This app now uses:

- Next.js App Router
- JWT cookie authentication (server-signed)
- MongoDB (Mongoose) as the source of truth

All business data is stored per authenticated user in MongoDB (multi-tenant isolation by user account).

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env.local
```

3. Fill in:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `AUTH_SECRET`
- `AUTH_URL` (for local dev: `http://localhost:3000`)
  - `AUTH_SECRET` is required for signing/verifying JWT session cookies.

Optional provider keys:

- `GMAIL_APP_PASSWORD`
- `RESEND_API_KEY`
- `SENDGRID_API_KEY`
- `ADMIN_EMAILS` (comma-separated admin emails, default includes `kalkmanwm@gmail.com`)
- `EMAIL_PROVIDER` (`gmail` | `resend` | `sendgrid`)
- `EMAIL_FROM`
- `EMAIL_CONFIRMATION_TO` (comma-separated)
- `ALLOWED_ORIGINS` (comma-separated origins allowed to call mutating API routes)
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (recommended for shared/distributed rate limiting in production)

4. Start the app:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) and register your first account.

## Authentication

- Login page: `/login`
- Register page: `/register`
- Protected dashboard routes require an authenticated session.
- Profile page: `/profile`
- Admin users page: `/users` (admin only)

## Database Behavior

- Workspace data is loaded from `/api/workspace` after login.
- Client-side Zustand state auto-syncs back to MongoDB.
- Email send logs are stored in MongoDB and shown in the Emails page.

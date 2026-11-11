# Deployment

The demo runs on three free tiers, each hosting one part:

```
Vercel (frontend) ──HTTPS──▶ Render (FastAPI backend) ──▶ Supabase (Postgres)
```

| Part | Host | Free-tier catch |
|------|------|-----------------|
| Frontend | Vercel | None that matters for a demo |
| Backend | Render web service | Sleeps after ~15 minutes without traffic; the next request waits about a minute while it starts |
| Database | Supabase | Pauses after a week with no activity; restore it from the Supabase dashboard |

None of them needs a payment card. The backend is described in `render.yaml`
at the repo root (a Render *Blueprint*), so its settings live in the repo rather
than only in a dashboard.

This page covers the backend and database. The frontend steps come next.

## 1. Database: Supabase

1. Create a project at [supabase.com](https://supabase.com).
   - **Region:** Central EU (Frankfurt), the same region as the Render service
     in `render.yaml`. A database on another continent adds a round trip to
     every query.
   - **Database password:** generate one with only letters and digits and keep
     it in a password manager. Symbols are allowed, but they then have to be
     percent-encoded inside the connection URL, which is easy to get wrong.
2. **Turn off the Data API** (Project Settings → Data API).
   *Why:* Supabase can serve every table in the `public` schema over an
   HTTP API. Its access control relies on Row Level Security policies, and our
   tables have none, because the backend is the only thing meant to touch the
   database. We connect over plain Postgres, so that API is an unused open door.
3. Copy the connection string: **Connect** → **Session pooler**. It looks like
   `postgresql://postgres.<ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`.
   Put your password in and add `?sslmode=require` on the end.
   - *Why the session pooler:* the direct connection is IPv6-only, and Render
     connects over IPv4. The *transaction* pooler (port 6543) suits serverless
     functions that open a connection per request; the backend is a
     long-running server with its own connection pool, which is what session
     mode is for.
   - *Why `sslmode=require`:* the connection crosses the public internet, and
     this makes the driver refuse to connect without encryption.

You don't create any tables. The backend creates them and seeds the demo data
on its first start (see [features.md](./features.md#automatic-database-setup-and-seeding)).

## 2. Backend: Render

1. Sign up at [render.com](https://render.com) with GitHub and give it access
   to the `taskflow` repository.
2. **New → Blueprint**, pick the repository and the `main` branch. Render reads
   `render.yaml` and asks for each variable marked `sync: false`:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | The Supabase session pooler string from step 1 |
   | `CLERK_SECRET_KEY` | The same value as in your root `.env` |
   | `CLERK_WEBHOOK_SIGNING_SECRET` | Leave empty for now; step 3 fills it in. Empty means the webhook refuses every delivery |
   | `SEED_PASSWORD` | The password demo visitors sign in with as `alice@example.com`. Not one you use anywhere else |
   | `CLERK_AUTHORIZED_PARTIES` | The frontend's production origin, e.g. `https://taskflow-xyz.vercel.app` (Vercel → Project → Settings → Domains). `https://`, no trailing slash, never `*` |
   | `CORS_ALLOWED_ORIGINS` | The same origin |

   *Why the last two matter:* the frontend and the API are now on different
   domains. `CORS_ALLOWED_ORIGINS` tells browsers which site may read the
   API's responses. `CLERK_AUTHORIZED_PARTIES` makes the backend reject Clerk
   tokens issued to any other site, so a token from someone else's Clerk app
   can't be replayed here.
3. Render builds the `production` stage of `backend/Dockerfile` and starts it.
   The log should show the tables being created and the seed running.

### Check it works

- `https://<service>.onrender.com/` returns `{"message": "taskflow API is running"}`.
- `https://<service>.onrender.com/api/boards` returns **401**: the route
  exists and refuses a request with no token.
- Supabase's Table Editor shows the seven tables and the demo data.

## 3. Clerk webhook

1. In the Clerk dashboard: **Webhooks → Add endpoint**, URL
   `https://<service>.onrender.com/api/webhooks/clerk`, events `user.updated`
   and `user.deleted`.
2. Copy the endpoint's signing secret (`whsec_…`) into
   `CLERK_WEBHOOK_SIGNING_SECRET` on Render. Saving redeploys the service.

The deployed backend and local development share one Clerk development
instance, so the demo users are the same accounts in both. Clerk's development
instances work on any domain; they show a small "Development mode" badge and
allow up to 100 users.

## Day to day

- **Deploys:** every push to `main` that changes `backend/` rebuilds and
  redeploys the service (`buildFilter` in `render.yaml`).
- **Logs and environment variables:** the service's page in the Render
  dashboard.
- **Database paused:** if the API's log shows connection errors after a quiet
  week, restore the project from the Supabase dashboard.

## Production settings in the image

The `production` stage of `backend/Dockerfile` differs from the one Compose
runs locally:

- It listens on `$PORT`, which Render sets, falling back to 8000.
- It runs **one** worker. Each worker runs the startup seed, and several
  racing on an empty database can insert the demo data twice. One also fits
  in the free tier's 512 MB.
- It trusts `X-Forwarded-Proto` from Render's proxy, which handles HTTPS in
  front of the container. Without that, FastAPI builds redirect URLs with
  `http://`, and browsers block those on an `https://` page.
- It runs as a non-root user and has no `--reload`.

`backend/app/database/session.py` also sets `pool_pre_ping=True`, so a
connection that Supabase closed while idle is replaced instead of failing the
next request.

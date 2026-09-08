# FixFlow

Turns WhatsApp conversations into jobs, schedules, and payments for
local service businesses (AC/appliance repair first).

## Stack

- Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind
- PostgreSQL via Prisma ORM (Postgres runs in Docker)
- Hugging Face Inference (Qwen2.5-7B-Instruct) for message understanding,
  with a deterministic rule-based fallback so the demo works with no
  token configured
- A built-in WhatsApp simulator that shares its data model and
  processing pipeline with a real Meta Cloud API webhook handler

## Run it

```bash
docker compose up -d        # Postgres
npm install
npx prisma db push          # create tables
npx tsx prisma/seed.ts       # seed demo business, technicians, customers, jobs
npm run dev
```

Open http://localhost:3000 — log in with `owner@koolcare.in` /
`fixflow123` (seeded, shown pre-filled on the login screen).

## Demo script

1. **Dashboard** — today's jobs, revenue, and an "Attention Required"
   list (a delayed job, a pending payment, an expiring warranty — all
   pre-seeded so this is populated on first login).
2. **Inbox** — click a preset under "Simulate WhatsApp message" (e.g.
   "AC not cooling") and send it. FixFlow classifies the message,
   extracts the job details and a cost estimate, and drafts a reply —
   click **Create Job** to turn the conversation into a job in one
   click.
3. **Jobs** — assign a technician and time; the customer is notified
   automatically (as a simulated outbound WhatsApp message).
4. **Technician view** (`/technician`, no login — this is what a
   technician would open on their phone) — start the job, record
   findings/parts/labour, and complete it. This creates a payment
   request and a warranty automatically.
5. **Payments** — mark the payment received.
6. **Customers** — see the full job history and lifetime value per
   customer, and send a one-click AI follow-up message.

## Configuration

- `HF_TOKEN` in `.env.local` — enables real Hugging Face-powered
  message understanding (Qwen2.5-7B-Instruct, auto-routed to whichever
  inference provider serves it). Get one at hf.co/settings/tokens.
  Without it, FixFlow uses a keyword-based fallback (handles common
  English/Hindi/Hinglish phrasing) so every flow above still works
  end-to-end.
- To go live on real WhatsApp: point Meta's Cloud API webhook
  configuration at `/api/whatsapp/webhook` and set
  `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. It shares the exact same processing
  pipeline as the in-app simulator (`src/lib/whatsapp.ts`) — no other
  code changes needed.

## Known simplifications (demo scope, not production-ready)

- **Auth** is a single seeded owner account with a plain session
  cookie (not signed/encrypted) — fine for a local pitch demo, not for
  a real multi-tenant deployment.
- **Technician pages are unauthenticated** (`/technician/[id]`) — in
  production these would be behind a phone-based magic link.
- **Follow-up reminders** are a one-click action (Customers → "Send
  Follow-up"), not a scheduled background job — the doc's original
  design calls for Redis/BullMQ-driven automatic reminders.
- **No file uploads** — job photos and customer signatures are not
  implemented in this iteration.

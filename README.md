# Invoicing & Proposals SaaS

Simple invoicing and proposal tool for freelancers and small service
businesses. Clients get sent a no-login link to view/pay an invoice or
accept a proposal.

## Stack
- Next.js (App Router, TypeScript)
- PostgreSQL via Supabase + Prisma
- Auth.js (NextAuth v5) — email/password + Google
- Resend — sending invoice/proposal emails
- Tailwind CSS
- Stripe — added later (client invoice payments + our own subscription billing)

## Local setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` / `DIRECT_URL` from your Supabase project (Project Settings -> Database)
   - `AUTH_SECRET` — generate with `npx auth secret`
   - `RESEND_API_KEY` from resend.com
3. `npx prisma migrate dev --name init` — creates the tables in Supabase
4. `npx prisma generate` — generates the typed Prisma client
5. `npm run dev` — starts the app at http://localhost:3000

## Build progress
- [x] Project scaffold (Next.js + Tailwind + TypeScript)
- [x] Prisma schema: User, Client, Invoice, InvoiceLineItem, Proposal, ProposalLineItem, Subscription
- [ ] Auth & onboarding
- [ ] Client management
- [ ] Invoice builder
- [ ] Dashboard
- [ ] PDF export
- [ ] Proposals
- [ ] Email sending (Resend)
- [ ] Stripe: client invoice payments
- [ ] Stripe: our own subscription billing

## Notes
- Client-facing invoice/proposal pages are accessed via an unguessable
  `publicToken` (not the sequential id) — never link to them by numeric id.
- Invoice/proposal numbers are sequential *per user*, tracked via
  `nextInvoiceNumber` / `nextProposalNumber` on `User`, incremented inside a
  transaction when a new one is created.

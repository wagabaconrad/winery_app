@AGENTS.md

# Winery OS — Project Context

## Tech Stack
- **Framework**: Next.js 16.2.2 (Turbopack) — App Router. `middleware.ts` is deprecated, use `src/proxy.ts` instead
- **Auth**: Clerk (`@clerk/nextjs`) — `clerkMiddleware` in `src/proxy.ts`, `getAuthenticatedUser()` / `getBusinessId()` in `src/lib/auth.ts`
- **Database**: PostgreSQL via Supabase, accessed through Prisma ORM (`@prisma/client` + `@prisma/adapter-pg`)
- **Styling**: Tailwind CSS + custom components in `src/components/ui/`
- **PDF**: jsPDF for client-side invoice generation

## Key Commands
```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build — run before committing to catch type errors
npx prisma generate   # Regenerate Prisma client after schema changes
npx prisma db push    # Push schema changes to Supabase
```

## Project Structure
```
src/
  proxy.ts              # Auth proxy (Next.js 16 replacement for middleware.ts)
  app/
    page.tsx            # Public landing page
    (dashboard)/        # All protected dashboard routes
    api/                # API route handlers
    sign-in/ sign-up/   # Clerk auth pages
  lib/
    auth.ts             # getAuthenticatedUser(), getBusinessId()
    prisma.ts           # Prisma client singleton
    calculations.ts     # Pure financial calculation functions
    invoice-pdf.ts      # PDF generation
  components/ui/        # Reusable UI components
```

## Security Decisions
- **Proxy public routes**: `/`, `/sign-in(.*)`, `/sign-up(.*)`, `/api/webhooks(.*)` — all other routes require auth
- **Webhooks**: Svix signature verification via `CLERK_WEBHOOK_SECRET` — never process without it
- **Input validation**: All numeric inputs in API routes are validated (not NaN, not negative)
- **Error responses**: Never expose `error.stack` or `error.message` in API responses
- **Security headers**: Configured in `next.config.ts` — CSP allows Clerk, Supabase, Cloudflare Turnstile
- **Secrets**: `.env` and `.env.local` are gitignored — never commit them

## Environment Variables Required
```
DATABASE_URL              # Supabase PostgreSQL connection string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET      # From Clerk Dashboard → Webhooks → Signing Secret
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
```

## Multi-tenancy Pattern
Every API route fetches `businessId` via `getBusinessId()` and scopes all Prisma queries to that ID. Never query without a `where: { businessId }` filter.

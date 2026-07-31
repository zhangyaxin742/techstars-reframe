# Reframe — Techstars Startup Weekend (Winner)

Reframe is an **AI CMO for founders who have a product but no audience** — built and shipped during a Techstars Startup Weekend hackathon, where the team pivoted mid-event (from an earlier concept, Vektr) and took first place.

## Product surfaces

- **Landing + waitlist** (`app/page.tsx`) — an intake chat that qualifies founders conversationally, feeding a hardened waitlist API.
- **Workspace** (`app/workspace/page.tsx`) — the interactive Reframe demo: content strategy and creation flows for founder-led marketing.
- **Trend studio** (`app/trending/page.tsx`) — surfacing what's currently converting so founders can ride distribution instead of guessing.

## Engineering highlights

- **Tested under hackathon pressure** — Vitest + Testing Library coverage across the API route, hero, intake chat, and waitlist modal (`*.test.tsx` colocated with components). Strict TypeScript throughout.
- **Production-grade waitlist API** (`app/api/waitlist/route.ts`) — rate limiting, defensive input normalization (email pattern check, URL canonicalization with hostname validation, length caps), UTM/referrer metadata capture, and typed provider errors so a missing Supabase/Resend config fails loudly instead of silently dropping signups.
- **Design-system discipline** — shared Tailwind tokens (`bg-card`/`bg-background` surfaces), Radix primitives, Framer Motion, and documented working rules in `AGENTS.md` for AI-agent-assisted development.

## Stack

Next.js 15 App Router · React 19 · strict TypeScript · Tailwind CSS · Vitest/jsdom · Radix UI · Framer Motion · Supabase · Resend

## Commands

```bash
npm run dev        # dev server
npm run test:run   # run the test suite once
npm run typecheck  # strict TS check
npm run build      # production build
```

Waitlist submission requires Supabase and Resend environment variables at runtime; see `lib/waitlist/submit.ts` for the expected config.

# Copilot Instructions

## Commands

```bash
npm run dev          # Dev server (Turbopack, port 9002)
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript type check (tsc --noEmit)
npm run genkit:dev   # Genkit AI dev server
```

No test framework is configured in this project.

## Architecture

Next.js 15 App Router application — a club member management system for STEM研究部. Discord OAuth via Supabase Auth is the sole login method.

### Supabase Clients (`src/lib/supabase/server.ts`)

Two server-side clients exist with an important distinction:

- **`createClient()`** — cookie-based SSR client (`@supabase/ssr`). RLS applies. Use for authenticated user operations.
- **`createAdminClient()`** — uses `@supabase/supabase-js` directly (not `@supabase/ssr`). Bypasses RLS entirely. This is intentional: the SSR client injects the user JWT from cookies, which causes RLS to evaluate as `authenticated` role, silently returning 0 rows for UPDATE/DELETE. Admin operations must use this client.

All DB queries use the **`member` schema**. This is set in both client constructors and must never be changed.

### Auth & Session Flow

1. `/login` → Discord OAuth → `/auth/callback` exchanges code for Supabase session
2. `src/middleware.ts` calls `updateSession` on all non-static routes, handling session refresh and route protection
3. Public paths (no auth required): `/login`, `/auth/callback`, `/oauth/*`, `/api/*`

### Built-in OAuth 2.0 Provider

This app is itself an OAuth 2.0 authorization server for third-party apps:

- Authorization endpoint: `/oauth/authorize` → consent page → issues authorization code
- Token endpoint: `/oauth/token` — exchanges code + PKCE (S256 only) for JWT
- Userinfo endpoint: `/oauth/userinfo` — returns member profile from JWT
- JWT utilities: `src/lib/oauth.ts` (HS256 signing)
- Admin management: `/dashboard/admin/oauth`

### Server Actions

All mutations go through Next.js Server Actions in `src/lib/actions/`:
- `members.ts` — registration, profile update, admin member management, Discord sync
- `teams.ts` — team CRUD
- `generations.ts` — generation/Discord role mapping

Admin actions call `checkAdmin()`, which queries `members.is_admin`. Each action file duplicates this check — follow the same pattern when adding new admin actions.

### Discord Bot Integration

Server actions call an external Discord bot API (`NEXT_PUBLIC_STEM_BOT_API_URL`) with Bearer token auth for role sync and nickname updates. These calls are fire-and-forget: errors are logged but never fail the parent mutation.

### Member Status Values

- `0` = Junior High School student (中学生)
- `1` = High School student (高校生)
- `2` = OB/OG (alumni/卒業生)

### Route Map

```
src/app/
  login/                      Discord OAuth login
  auth/callback/              Supabase OAuth callback (honors `oauth_redirect` httpOnly cookie
                              to restore original destination for the built-in OAuth flow)
  dashboard/
    page.tsx                  Profile (also checks Discord server membership)
    register/                 Initial member registration
    settings/apps/            User-facing OAuth consent management
    admin/{members,teams,oauth,system}/   Admin-only areas
  oauth/{authorize,token,userinfo}/       Built-in OAuth 2.0 provider
  api/
    admin/oauth/clients/      OAuth client CRUD (admin)
    user/oauth/consents/      User consent revocation
    auth/debug/               Auth debug
```

### Environment Variables

Required in `.env`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_DISCORD_INVITE_URL
NEXT_PUBLIC_STEM_BOT_API_URL
STEM_BOT_API_BEARER_TOKEN
NEXT_PUBLIC_DISCORD_LINKED_ROLE_NAME   # default: "連携済み"
JWT_SECRET                              # OAuth token signing (HS256)
```

### CI/CD

`.github/workflows/backup.yml` — daily `pg_dump` at 02:00 JST, GPG AES256 encrypted, pushed to a separate backup repo, prunes >7 days old. Secrets: `SUPABASE_DB_URL`, `GPG_PASSPHRASE`, `BACKUP_REPO_TOKEN`, `BACKUP_REPO`.

## Conventions

- **UI components**: shadcn/ui (Radix UI + Tailwind CSS) in `src/components/ui/`. Add new components via the shadcn CLI (`npx shadcn@latest add <component>`).
- **Path alias**: `@/*` maps to `./src/*`.
- **Forms**: react-hook-form + zod schemas defined at the top of each action file.
- **Validation messages and UI text** are in Japanese.
- **`revalidatePath`** is called after mutations to refresh cached data.
- **Fonts**: Inter + Noto Sans JP, set as CSS variables in the root layout.
- **Generation calculation**: Derived from academic year (starts April), status, and grade — see `calculateGeneration()` in `members.ts`.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (Turbopack, port 9002)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint
npm run lint

# Type check
npm run typecheck

# Genkit AI dev server
npm run genkit:dev
```

## Architecture Overview

This is a **Next.js 15 App Router** application — a club member management system ("Clubhouse Manager") for STEM研究部. It uses Discord OAuth via Supabase Auth as the sole login method.

### Key Technology Stack
- **Auth**: Supabase (`@supabase/ssr`) with Discord OAuth provider
- **Database**: Supabase (PostgreSQL), accessed via the `member` schema — **never change this schema name**
- **UI**: shadcn/ui components (Radix UI + Tailwind CSS) in `src/components/ui/`
- **Forms**: react-hook-form + zod validation
- **AI**: Genkit (Google GenAI) in `src/ai/`

### Supabase Client Usage

There are two server-side clients in `src/lib/supabase/server.ts`:

- `createClient()` — cookie-based SSR client for authenticated user operations (RLS applies)
- `createAdminClient()` — uses `SUPABASE_SERVICE_ROLE_KEY` directly via `@supabase/supabase-js`, **not** via `@supabase/ssr`. This is intentional: the SSR client reads user JWT from cookies which causes RLS to evaluate as `authenticated` role, silently returning 0 rows for UPDATE/DELETE. The admin client bypasses RLS entirely.

All DB queries use the `member` schema. The schema is set in both client constructors and must not be changed.

### Authentication & Session Flow

1. User hits `/login` → redirected to Discord OAuth
2. Discord redirects to `/auth/callback` which exchanges the code for a Supabase session
3. The callback handles `oauth_redirect` httpOnly cookie to restore the user's original destination (used for the built-in OAuth 2.0 server flow)
4. `src/middleware.ts` calls `updateSession` on all routes except static assets

### Built-in OAuth 2.0 Provider

This app is itself an OAuth 2.0 authorization server (for third-party apps to authenticate club members):

- `GET /oauth/authorize` — validates client, checks login, redirects to consent page
- `POST /oauth/authorize/consent/actions.ts` — creates authorization code in DB
- `POST /oauth/token` — exchanges code + PKCE verifier for JWT access token
- `GET /oauth/userinfo` — returns member profile from JWT
- Admin management at `/dashboard/admin/oauth`
- JWT utils in `src/lib/oauth.ts` (HS256, PKCE S256 only)

### Member Status Values
- `0` = Junior High School student
- `1` = High School student  
- `2` = OB/OG (alumni)

### Discord Bot Integration

Server actions in `src/lib/actions/members.ts` call an external Discord bot API (`NEXT_PUBLIC_STEM_BOT_API_URL`) with Bearer token auth for:
- Role sync: `POST /api/roles/sync` and `/api/roles/sync-all`
- Nickname update: `POST /api/nickname/update`
- Member status: `GET /api/member/status`

These calls are fire-and-forget (errors are logged but don't fail the mutation).

### Route Structure

```
src/app/
  page.tsx                    → redirects to /dashboard
  login/                      → Discord OAuth login page
  auth/callback/              → Supabase OAuth callback handler
  dashboard/
    page.tsx                  → Profile page (checks Discord server membership)
    register/                 → Initial member registration
    settings/apps/            → Connected OAuth apps (user consent management)
    admin/
      members/                → Member management (admin only)
      teams/                  → Team management (admin only)
      oauth/                  → OAuth client management (admin only)
      system/                 → Bulk operations (role sync, academic year update)
  oauth/
    authorize/                → OAuth authorization endpoint
    token/                    → OAuth token endpoint
    userinfo/                 → OAuth userinfo endpoint
  api/
    admin/oauth/clients/      → REST API for OAuth client CRUD
    user/oauth/consents/      → REST API for user consent revocation
    auth/debug/               → Auth debug endpoint
```

### Server Actions

All mutations go through Next.js Server Actions in `src/lib/actions/`:
- `members.ts` — registration, profile update, admin member management, Discord sync
- `teams.ts` — team CRUD
- `generations.ts` — generation/Discord role mapping

Admin operations call `checkAdmin()` which queries the `members` table for `is_admin: true`.

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
JWT_SECRET                              # for OAuth token signing
```

### CI/CD

`.github/workflows/backup.yml` — daily PostgreSQL backup at 02:00 JST. Dumps with `pg_dump`, encrypts with GPG AES256, pushes to a separate backup repository, and prunes backups older than 7 days. Requires GitHub secrets: `SUPABASE_DB_URL`, `GPG_PASSPHRASE`, `BACKUP_REPO_TOKEN`, `BACKUP_REPO`.

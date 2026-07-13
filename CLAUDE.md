# MindFlow — AI-powered mobile journaling app

> App name: **MindFlow** (used everywhere — app, companion, store listing,
> legal docs). The domain is `mindflowjournal.app`.

## Stack
- Backend: Go 1.22+ (REST API) — golang.org/x/crypto pinned to v0.31.0 for Go 1.22 compatibility
- Mobile: React Native (Expo 54, expo-router v6, TypeScript strict)
- Database: PostgreSQL (Railway in prod, Docker Compose locally)
- AI: Claude API (claude-sonnet-4-6)
- Payments: RevenueCat (Apple In-App Purchase + Google Play Billing)
- Auth: Custom JWT (bcrypt + refresh-token rotation)

## Commands
- `cd backend && go run ./cmd/api` → start Go API
- `cd mobile && npx expo start` → start Expo dev server
- `docker compose up -d` → start local PostgreSQL

## Conventions
### Go
- Standard Go project layout
- Errors always handled explicitly, never ignored
- All handlers in internal/
- DB queries in db/

### React Native
- Functional components + hooks only
- No class components
- TypeScript strict mode, no `any` types
- All API calls in services/

## Git
- Commit messages: imperative mood, under 72 chars
- Branch per feature: feature/name
- Never commit .env files

## 📋 TODO
- **`todo.md` (repo root) is the authoritative live tracker** — grouped
  🔴 blockers / 🟠 legal / 🟡 build / 🟢 Railway env / ⚪ nice-to-have.
  Read it first; the checklist below is only a high-level snapshot.
- App-feature backlog is clear (pattern detection + Insights shipped).
  Remaining pre-launch work is store/deployment prep + legal finalisation.
- **Key decisions locked (2026-07):** legal entity = **Open Brain Development
  SL** (NIF B26910588); billing model = free trial (full app incl. AI) →
  free tier (journaling only, no AI) → Pro (full), enforced in the backend;
  UK = geo-restrict (no Art. 27 rep). See `legal_compliance` memory,
  `COMPLIANCE.md`, `legal.md`, `ENTITY_MIGRATION.md`, `DPIA.md`, `TIA.md`.
- **Helper docs (repo root):** `todo.md`, `HANDOFF.md`, `STORE_LISTING.md`,
  `store-privacy-forms.md`, `revenuecat.md`, `ENTITY_MIGRATION.md`,
  `DPIA.md`, `TIA.md` — reference/handoff material, now tracked.

## DEPLOYMENT CHECKLIST (before Railway launch)
Backend env vars (Railway):
- [ ] Set JWT_SECRET (server refuses to start without it — no fallback)
- [ ] Set DB_SSL_MODE=require for Railway Postgres
- [ ] Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
- [ ] Set ANTHROPIC_API_KEY
- [ ] Set REVENUECAT_WEBHOOK_SECRET (validates the Authorization header
      on POST /api/webhooks/revenuecat)
- [ ] Set RESEND_API_KEY + RESEND_FROM_EMAIL — without them the email
      client is disabled, so password-reset and inactivity emails
      silently don't send
- [ ] Set ALLOWED_ORIGINS to the production URL (code already reads it
      from env in middleware/cors.go — no code change needed)

Mobile / RevenueCat:
- [ ] Replace the REPLACE_WITH_… placeholders in eas.json with the real
      EXPO_PUBLIC_REVENUECAT_IOS_KEY / _ANDROID_KEY public keys
- [ ] Create subscription products in App Store Connect + Play Console,
      link them in RevenueCat, and test purchase/restore on a device

Store submission (see todo.md for the full list + context):
- [ ] Developer accounts as the SL (Organization) — needs a D-U-N-S for
      Open Brain Development SL. Play: keep the existing individual account,
      transfer to an SL org account later (don't buy a 2nd $25 up front).
      Apple: enroll Organization ($99/yr); ship Android first if Apple stalls.
- [ ] Paid legal review of privacy policy + terms (~€150), THEN set effective
      dates + remove DRAFT banners on the hosted pages.
- [ ] Reassign Anthropic/Railway/Resend DPAs to the SL (ENTITY_MIGRATION.md).
- [ ] Complete Apple App Privacy + Google Play Data Safety + Play Health Apps
      forms (drafted in store-privacy-forms.md); set age rating 16+.
- [ ] At submission, deselect the United Kingdom territory (geo-restrict).

Done (kept for reference): legal entity resolved (Open Brain Development SL);
billing model decided + backend-enforced; UK geo-restrict decided; DPIA +
TIA drafted; profiling policy verified against code + docs/privacy.html drift
fixed; flow-themed icon shipped; eas.json created; Insights screen has real
content; CORS reads ALLOWED_ORIGINS from env; trigger logging is stdout via
slog; app version 1.0.0 + ITSAppUsesNonExemptEncryption set; legal docs hosted
at mindflowjournal.app.

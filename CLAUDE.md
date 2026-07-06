# MindFlow — AI-powered mobile journaling app

> App name: **MindFlow** (used everywhere — app, companion, store listing,
> legal docs). The domain is `mindflowjournal.app`.

## Stack
- Backend: Go 1.22+ (REST API) — golang.org/x/crypto pinned to v0.31.0 for Go 1.22 compatibility
- Mobile: React Native (Expo 54)
- Database: PostgreSQL (Railway in prod, Docker Compose locally)
- AI: Claude API (claude-sonnet-4-6)
- Payments: RevenueCat (Apple In-App Purchase + Google Play Billing)
- Auth: Custom JWT (bcrypt + refresh-token rotation)

## Project Structure
- /backend → Go REST API
- /mobile → React Native Expo app

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
- App-feature backlog is clear: pattern detection (weekly job in
  internal/patterns) and the Insights screen (real charts, calendar,
  mood trends) are both shipped. Remaining pre-launch work is store/
  deployment prep — see the checklist below.

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

Store submission:
- [ ] Apple Developer account ($99/yr) + Google Play ($25 one-time)
- [ ] Commission the flow-themed app icon (current mark is a soundwave);
      replace assets/icon.png, adaptive-icon.png, splash-icon.png
- [ ] Paid legal review of the (already hosted) privacy policy + terms
      (~€150); set their effective dates before publishing
- [ ] Complete Apple App Privacy + Google Play Data Safety forms;
      set age rating to 16+
- [ ] App Store developer name + legal docs must use a company name,
      not a personal name, if acquisition is the goal — decide the
      legal entity (autónomo vs SL) before submission

Done (kept for reference): eas.json created; Insights screen has real
content; CORS reads ALLOWED_ORIGINS from env; trigger logging is
stdout via slog (no unbounded log file); app version 1.0.0 +
ITSAppUsesNonExemptEncryption set; legal docs hosted at
mindflowjournal.app.

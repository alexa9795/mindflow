# MindFlow

## Stack
- Backend: Go 1.22+ (REST API) — golang.org/x/crypto pinned to v0.31.0 for Go 1.22 compatibility
- Mobile: React Native (Expo 55)
- Database: PostgreSQL (Supabase)
- AI: Claude API (claude-sonnet-4-6)
- Payments: Stripe
- Auth: Supabase Auth

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
- Pattern detection (analyse mood trends and common themes across entries)
- Insights screen (currently placeholder — must show real content
  before App Store submission; will display pattern detection
  results, mood trends, word frequency)

## DEPLOYMENT CHECKLIST (before Railway launch)
- [ ] Set JWT_SECRET env var (never use the dev fallback in prod)
- [ ] Set DB_SSL_MODE=require for Railway Postgres
- [ ] Restrict CORS Access-Control-Allow-Origin from "*" to the
      actual Railway backend URL in middleware/cors.go
- [ ] Set ANTHROPIC_API_KEY env var
- [ ] Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME for
      Railway Postgres instance
- [ ] Review trigger word log rotation (logs/triggers.log will
      grow unbounded in production)
- [ ] Privacy policy in place before App Store submission (~€150)
- [ ] Apple Developer account ($99/yr) + Google Play ($25 one-time)
- [ ] Insights screen must have real content (not placeholder)
      before App Store submission — empty screens fail review

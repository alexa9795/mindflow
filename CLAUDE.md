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

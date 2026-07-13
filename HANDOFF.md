# MindFlow — Session Handoff

Paste this into a new session to hand off context. Keep it up to date as the
project state changes.

---

I'm working on **MindFlow**, an AI-powered mobile journaling app, at
`/home/adumitru/PERSONAL/mindflow` (git repo, branch `main`). Read `CLAUDE.md`
first for project instructions, then `todo.md` (untracked, at repo root) which
is the live pre-launch task tracker.

**Read before doing anything:** `CLAUDE.md`, `todo.md`, and `STORE_LISTING.md`.
`store-privacy-forms.md` has ready-to-submit Apple App Privacy + Google Play
Data Safety answers (drafted from the codebase).

**What it is:** Go REST API backend (`/backend`, stdlib net/http, PostgreSQL) +
React Native Expo 54 app (`/mobile`, expo-router v6, TypeScript strict). Module
path `github.com/alexa9795/mindflow`. AI via Claude API. Payments via RevenueCat
(Apple IAP + Google Play Billing). Custom JWT auth (bcrypt + refresh rotation).
Hosted on Railway; legal docs on GitHub Pages at `mindflowjournal.app` (`/docs`).

**Latest session (2026-07-13) — legal-entity + billing-model work (this commit):**
- **Legal entity RESOLVED:** publishing under the existing Spanish SL
  **Open Brain Development SL** (NIF B26910588, Plaza Music Fayos Num 4, Esc. C,
  Planta 3, Puerta 5, Valencia). Applied as data controller/provider across
  `PRIVACY_POLICY.md`, `TERMS_OF_SERVICE.md`, `docs/privacy.html`,
  `docs/terms.html`; status flipped in `COMPLIANCE.md` / `legal.md`.
- **Billing model decided + backend-enforced:** free trial = full app (incl.
  AI); after trial → free tier = journaling only (10 entries/mo, no AI); Pro =
  full. Code: `SubscriptionStatus.CanUseAI` + `middleware.RequireAISubscription`
  on the AI routes; new `AI_SUBSCRIPTION_REQUIRED` 403. Tests added; backend
  builds + `go test ./...` pass. (Planned: Claude-style daily AI usage cap —
  see todo.md.)
- **Profiling/§3.4 verified against code**; removed a policy over-claim
  (word/theme analysis that no code does), aligned the trigger legal basis in
  `ai/logger.go`, and **fixed `docs/privacy.html` drift** (it was missing the
  §3.4 profiling, §6.4 payments, and international-transfers sections).
- **UK = geo-restrict** (no Art. 27 rep). **DPIA.md + TIA.md** drafted.
  **ENTITY_MIGRATION.md** documents moving accounts/DPAs to the SL + D-U-N-S.
- Still DRAFT on purpose: legal docs' effective date + DRAFT banners wait on
  the paid legal review. Prices/trial length still TBD (block Terms §8).

**Earlier state (committed up to `f905597`):**
- The app was rebranded from "Echo" → **MindFlow** everywhere. Zero "Echo" left.
  Components are `MindFlowLogo` / `MindFlowConsentModal`; storage keys are
  `mindflow_*`.
- Flow-themed app icon shipped (profile head + halftone stream-of-consciousness
  mark). `assets/icon.png`, `adaptive-icon.png`, `splash-icon.png` all updated.
  `MindFlowLogo` component renders the mark via react-native-svg paths.
- Login + register wordmark font size reduced 38→32 to fix clipping on narrow
  screens (`f905597`).
- RevenueCat implemented: backend webhook (`/backend/internal/revenuecat/`) +
  mobile `services/purchases.ts` + `app/paywall.tsx`. `eas.json` has
  **placeholder** RevenueCat keys (`REPLACE_WITH_…`) that still need real values.
- Legal docs: `PRIVACY_POLICY.md` + `TERMS_OF_SERVICE.md` (sources) rendered as
  `docs/privacy.html` + `docs/terms.html` (live, but both still marked **DRAFT**
  pending legal review). `/privacy` and `/terms` resolve via redirect stubs;
  canonical URLs use `.html`.
- iOS privacy manifest, version 1.0.0, and `ITSAppUsesNonExemptEncryption` are
  set in `app.json`.
- CI workflow + mobile smoke tests added.
- All merged feature branches deleted (local + remote).

**Known issue:** Expo Go loading screen still shows the old soundwave icon even
after `--clear`. `assets/icon.png` is correct; likely an Expo Go client cache.
Won't affect production EAS builds. Tracked in `todo.md`.

**Conventions/gotchas:**
- Go: errors handled explicitly; stdlib only; the repo uses **manual aligned
  assignments** in places, so don't run `gofmt -w` across whole dirs (it
  clobbers that style) — format only files you edit.
- TS strict, no `any`; all mobile API calls in `mobile/services/`.
- `grep -r` here **respects `.gitignore`**, so it silently skips `.env*` etc. —
  use `git grep` or check ignored files directly when auditing.
- **Helper/handoff docs are now tracked** (2026-07-13, by request before a
  device switch): `todo.md`, `HANDOFF.md`, `STORE_LISTING.md`,
  `store-privacy-forms.md`, `revenuecat.md`, `ENTITY_MIGRATION.md`, `DPIA.md`,
  `TIA.md`. They're reference material — keep `todo.md` as the live tracker.

**What remains** is fully listed in `todo.md` (grouped 🔴 blockers / 🟠 legal /
🟡 build / 🟢 Railway env / ⚪ nice-to-have). Biggest open blockers:
fill in real RevenueCat keys + create store products, complete store
privacy/data-safety forms, legal-entity decision + paid review, and set
effective dates / remove DRAFT banners on the legal pages.

Start by reading those files and confirming the current `git status` / latest
commit, then tell me what you see before making changes.

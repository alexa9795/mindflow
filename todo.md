# Pre-launch TODO — App Store / Google Play

Analysis of remaining work before publishing. Grouped by priority.

> **Branding decision (resolved & fully applied):** the app is **MindFlow**
> everywhere, including the AI companion (no separate persona name). Domain is
> `mindflowjournal.app`. **Every "Echo" reference is gone** — user-facing copy,
> component/file names (`MindFlowLogo`, `MindFlowConsentModal`), storage keys
> (`mindflow_*`), backend emails + AI system prompt, and all legal docs.
> Verified: backend builds + `go test ./...` pass, mobile `tsc` clean.
> (commit `d4003bf`)
>
> **Branding artwork DONE:** the flow-themed icon + `MindFlowLogo` mark shipped
> (profile head with a "stream of consciousness" halftone dissolving into the
> mind), replacing the old soundwave. All icon/adaptive/splash/favicon assets +
> SVG sources updated and the component reworked. See the (now-closed) icon
> item below.
>
> **Audit note (2026-07-03):** a stray "Echo" in `backend/.env.example`
> (RESEND_FROM_EMAIL) was missed by earlier greps (env files are gitignored,
> and `grep -r` here respects `.gitignore`) — now fixed. Repo is Echo-free.

> **Already shipped (was stale in CLAUDE.md — now cleaned up, commit `14bfdbc`):**
> `eas.json` exists; Insights screen fully built with real charts/calendar;
> CORS reads `ALLOWED_ORIGINS` from env; trigger logging is stdout-based via
> slog (no unbounded log file); in-app account deletion exists; app version
> 1.0.0 + `ITSAppUsesNonExemptEncryption`; iOS privacy manifest; legal docs
> hosted at mindflowjournal.app.

---

## 🔴 Blockers — will fail store review

- [x] **Standardize ALL branding on MindFlow** — user-facing copy, component/
      file renames (`MindFlowLogo`, `MindFlowConsentModal`), storage keys
      (`mindflow_*`), backend emails + AI system prompt, and every legal doc
      (`PRIVACY_POLICY.md`, `TERMS_OF_SERVICE.md`, `COMPLIANCE.md`, `legal.md`,
      `docs/privacy.html`). Zero "Echo" left in the repo. ✓ (commit `d4003bf`)
- [x] **App icon / logo mark — flow/mind-themed icon shipped.** New artwork
      (profile head with a halftone "stream of consciousness" flowing in and
      dissolving to negative space) replaced the soundwave: `assets/icon.png`,
      `assets/adaptive-icon.png`, `assets/splash-icon.png` (all 1024×1024) +
      their `.svg` sources, plus new `lockup`/`mindflow-mark` SVGs and a
      regenerated `favicon.png`. The `MindFlowLogo` component was reworked to
      render the new mark (typed, TS-strict; `hideText` = mark only; wordmark
      path uses the loaded `PlayfairDisplay_700Bold`). Call sites migrated from
      `width` → `height`. ✓ Verify inline mark sizing (height 52 login/register,
      44 welcome) on a device/simulator — it's a one-line tweak if it needs
      nudging. Store screenshots/listing are now unblocked.
- [x] **Make `docs/privacy.html` branding consistent** — all "Echo" persona
      references changed to "MindFlow's AI companion"; self-URL fixed to
      `privacy.html`. ✓ (pushed → live on GitHub Pages)
- [x] **Make Privacy Policy & Terms links tappable in signup** — `register.tsx`
      now opens `PRIVACY_POLICY_URL` / `TERMS_OF_SERVICE_URL` via `Linking`. ✓
- [~] **Host Terms of Service at a live URL.** `docs/terms.html` created and
      pushed (live on GitHub Pages; mirrors `TERMS_OF_SERVICE.md`, styled like
      privacy.html). **Still a DRAFT** — before removing the DRAFT banner +
      `.todo-box` notes it needs: legal-entity decision (§1/§15), final billing
      terms (§8), and paid legal review. (COMPLIANCE.md:112)
- [ ] **Wire RevenueCat for production:**
  - [x] Added `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY` to `eas.json`
        `preview` + `production` env — **replace the `REPLACE_WITH_…`
        placeholder values with the real RevenueCat public keys.** ✓ (placeholders)
  - [ ] Create subscription products in App Store Connect + Google Play Console
  - [ ] Link products in the RevenueCat dashboard; create an offering with
        monthly + yearly packages
  - [ ] Set `REVENUECAT_WEBHOOK_SECRET` on Railway (webhook returns 500 without it)
  - [ ] Test purchase + restore on a physical device / TestFlight
        (RevenueCat does not work in Expo Go)

### 💳 Billing model (DECIDED 2026-07-10)
Confirmed monetisation model:
- **Free trial (length TBD):** full app — journaling **+ AI**. A sample of the
  whole product.
- **After trial → free tier:** journaling only (10 entries/month), **no AI**.
- **Pro (monthly / yearly):** full app.
- [x] **Backend enforces this** — added `SubscriptionStatus.CanUseAI` +
      `middleware.RequireAISubscription`; AI endpoints (`/respond`,
      `/messages`) now require an active trial/paid/tester subscription (free
      tier gets `AI_SUBSCRIPTION_REQUIRED` 403). Tests added. (backend builds +
      `go test` pass.)
- [ ] **NEW FEATURE — daily AI usage limit (Claude-style).** Add a per-day
      usage cap on AI reflections with a "limit reached — resets at <time>, or
      upgrade" style message (applies during trial and to paid tiers as the
      product's fair-use limit). Not built yet — design the cap value, the
      reset window (rolling 24h vs midnight), where it's tracked (DB counter),
      and the mobile UX for the limit prompt. Backend enforcement point:
      alongside `RequireAISubscription` on the AI routes.
- [ ] **Mobile: route `AI_SUBSCRIPTION_REQUIRED` to the paywall.** Backend now
      returns this 403 for free-tier users hitting `/respond` + `/messages`.
      Currently the app shows the message inline (functional, informative) via
      the generic `ApiError` path in `app/entry/[id].tsx` (3 catch sites) +
      `handleConsentEnable`. Mirror the existing `SUBSCRIPTION_LIMIT_REACHED`
      → `SubscriptionLimitError` → `router.push('/paywall')` pattern for a
      cleaner UX. Do this with the RevenueCat device-testing pass.
- [ ] **Provide billing values** (block Terms §8 + STORE_LISTING.md prices):
      monthly price, yearly price, trial length + whether card required up
      front, the daily AI cap number, EULA choice (Apple standard vs own), and
      the EU 14-day withdrawal-right wording. Once given, fill Terms §8 +
      listing in one pass.
- [ ] **Complete store privacy disclosures** — answers drafted in
      `store-privacy-forms.md` (ready to copy-paste into the consoles):
  - [ ] Apple App Privacy "nutrition label" — submit in App Store Connect
  - [ ] Google Play Data Safety form — submit in Play Console
  - [ ] Google Play Health Apps declaration — submit in Play Console
  - [ ] Set age rating to 16+ on both stores (App Store: questionnaire then
        manually confirm 16+; Play: Content rating → Mental Health category)
- [x] **iOS Privacy Manifest added** — `expo.ios.privacyManifests` in app.json
      declares UserDefaults (`CA92.1`, for AsyncStorage) and FileTimestamp
      (`C617.1`, for expo-file-system), plus `NSPrivacyTracking: false`. ✓
      Verify the declared reasons still match at build time (Expo modules also
      ship their own manifests, merged automatically).
- [x] **Hosted legal URLs now resolve.** Added redirect stubs
      `docs/privacy/index.html` + `docs/terms/index.html` (so `/privacy` and
      `/terms` no longer 404), and standardised all doc references +
      self-links on the canonical `.html` form. Use the `.html` URLs directly
      in the store consoles. ✓ (deploys on push via GitHub Pages)
- [ ] **Set the effective date** in all four legal docs before publishing —
      currently `[PLACEHOLDER — set to publication date]` in
      `PRIVACY_POLICY.md`, `TERMS_OF_SERVICE.md`, `docs/privacy.html`,
      `docs/terms.html`.
- [ ] **Remove the DRAFT banners** from the hosted legal pages before
      publishing — `docs/privacy.html` (`draft-banner`) and `docs/terms.html`
      (`draft-banner` + the amber `.todo-box` notes). Do this only after the
      paid legal review + entity/billing decisions are locked in.

## 🟠 Legal / entity

- [x] Legal entity decision — **Open Brain Development SL** (NIF B26910588,
      Valencia), the user's existing SL. Named as controller/provider in all
      legal docs (2026-07-10). Also use this company name as the App Store /
      Play developer name. ⚠️ DPAs (Anthropic/Railway/Resend) still in
      Alexandra's personal name — reassign to the SL (see legal.md §3)
- [ ] **Reassign the three processor DPAs from the personal name to the SL**
      (Open Brain Development SL) so the paperwork matches the named controller.
      Keep existing accounts — just change the entity/billing details, and
      re-sign where a DPA was physically signed. Full steps in
      **ENTITY_MIGRATION.md**:
  - [ ] Railway — update billing legal name + re-issue the signed DocuSign DPA
        naming the SL (current one is in Alexandra's personal name)
  - [ ] Anthropic — set Organization/billing to the SL (DPA re-incorporates)
  - [ ] Resend — set account org/billing to the SL
- [ ] Paid legal review of privacy policy + terms (~€150) — this is the
      remaining hard gate before DRAFT banners come off. Hand the reviewer:
      DPIA.md, TIA.md, and the `[REVIEW]`/`[TODO]` markers in the legal docs.
- [x] **UK users decision (2026-07-10): GEO-RESTRICT.** The app will NOT be
      offered in the United Kingdom — deselect the UK territory in App Store
      Connect + Play Console at submission. This avoids the UK GDPR Art. 27
      representative obligation. Re-open only if we later decide to sell in the
      UK (then appoint a UK representative, ~£100–200/yr). Noted in DPIA §7 +
      TIA §7 + COMPLIANCE.md.
- [x] **DPIA drafted** — `DPIA.md` (Art. 35; special-category data + profiling).
      DRAFT for the paid review; contains a findings list (§6).
- [x] **Transfer Impact Assessment drafted** — `TIA.md` (US transfers to
      Anthropic/Railway/Resend). DRAFT; two open `[REVIEW]` items (DPF
      certification status; Anthropic retention + ZDR).
- [ ] Resolve remaining inline `[TODO]`s in `PRIVACY_POLICY.md`: Anthropic
      retention window (§6.1). (UK Art. 27 now resolved via geo-restrict; DPIA
      + TIA now drafted.)
- [x] Verify profiling / trigger-word behaviour matches policy §3.4 (2026-07-10)
      — verified against code: metadata-only trigger logging, statistical-only
      pattern detection, no Art. 22 decision. **Fixed policy discrepancies:**
      removed the non-existent "word/theme frequency analysis" row, corrected
      the pattern-detection description, aligned the trigger legal basis in
      `logger.go` with policy §3.4, and corrected §3.3 usage wording.
- [x] **Fixed `docs/privacy.html` drift (2026-07-10)** — the hosted HTML was
      missing three sections vs the markdown source: §3.4 Automated Analysis /
      Profiling (Art. 13(2)(f) disclosure), §6.4 Apple/Google payment
      processing, and the "International Transfers — General" paragraph. All
      inserted; Security Audit renumbered §3.4 → §3.5. HTML section structure
      now matches `PRIVACY_POLICY.md` exactly. ⚠️ Still needs a final pass at
      publish time for effective date + DRAFT-banner removal (after paid
      review). Consider a generated-from-markdown pipeline to prevent future
      drift.
- [ ] Set up BOTH contact mailboxes: `privacy@mindflowjournal.app`
      (Privacy Policy) and `support@mindflowjournal.app` (Terms) — both are
      referenced in the legal docs (COMPLIANCE.md:121)

## 🟡 Build & release config

- [x] Bump `app.json` `version` `0.1.0 → 1.0.0` ✓
- [x] Add `ITSAppUsesNonExemptEncryption: false` to iOS `infoPlist` ✓
- [ ] **Developer accounts — enroll as the SL (Organization), not individual.**
      To show "Open Brain Development SL" as the store developer name (and for
      the acquisition goal) both stores need **Organization** accounts:
  - [ ] **Get a D-U-N-S number for Open Brain Development SL** (free). Request
        this FIRST — it's the long pole for both org accounts. Easiest path:
        Apple's free D-U-N-S lookup/request tool
        https://developer.apple.com/enroll/duns-lookup/ (check if the SL
        already has one before requesting). Details in ENTITY_MIGRATION.md.
    - **Check if the SL already has a D-U-N-S (free, no purchase):** a Spanish
      SL is often assigned one at registration, so check before requesting —
      it can skip the ~1–2 week wait. Enter the name/address exactly as in the
      Registro Mercantil (a mismatch can miss an existing record).
      - Apple's D-U-N-S lookup tool — https://developer.apple.com/enroll/duns-lookup/
        (best: also feeds Apple enrollment directly)
      - Dun & Bradstreet lookup — https://www.dnb.com/duns-number/lookup.html
      - Informa D&B (Spain, local D&B partner) — https://www.informa.es
      - Or ask your gestor/asesor — they can usually find it quickly
  - [ ] **Apple Developer Program — enroll as Organization** ($99/yr) under the
        SL + D-U-N-S. ⚠️ History of enrollment problems on the personal account.
        If org enrollment also fails, contact Apple Developer Support directly
        (they resolve most enrollment blocks); do NOT block the whole launch on
        iOS — ship Android first if needed.
  - [ ] **Google Play — DECISION (2026-07-10): do NOT buy a 2nd $25 account up
        front.** An **individual** Play account already exists; Google does not
        allow converting individual → organization. Plan: launch on the
        existing individual account, then use Play's **app-transfer** flow to
        move the app to an SL Organization account later if/when acquisition is
        concrete (pay the $25 only when actually needed). See ENTITY_MIGRATION.md.
  - [ ] At submission, **deselect the United Kingdom** territory on both stores
        (UK geo-restrict decision — see Legal section).
- [~] **Store listing copy** — drafted in [STORE_LISTING.md](STORE_LISTING.md)
      (name, subtitle, short/full description, keywords, subscription
      disclosure, screenshot shot-list, copy guardrails). Remaining: confirm
      name availability, fill in real subscription prices, and finalise once
      the icon + screenshots exist.
- [ ] Store visual assets: per-device screenshots (see shot-list in
      STORE_LISTING.md), Play 512px icon + feature graphic, support URL

## 🟢 Railway env (code ready — just set values; see `backend/.env.example`)

- [ ] `JWT_SECRET` (server refuses to start without it)
- [ ] `DATABASE_URL` (preferred — Railway provides it; the code uses it over the
      individual `DB_*` vars) **or** `DB_HOST/PORT/USER/PASSWORD/NAME` +
      `DB_SSL_MODE=require`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `REVENUECAT_WEBHOOK_SECRET`
- [ ] `RESEND_API_KEY` + `RESEND_FROM_EMAIL` — **without these the email client
      is disabled**, so password-reset and inactivity-warning emails silently
      don't send (main.go treats email as optional). Password reset is a real
      user flow → set these.
- [ ] `ALLOWED_ORIGINS` restricted to the production URL (not `*`)

## ⚪ Lower risk / nice-to-have

- [x] Mobile smoke tests added — `jest-expo` setup with `test`/`test:ci`/
      `typecheck` scripts; 19 tests covering `services/api.ts` (auth request
      flow, 401 refresh-and-retry, error mapping) and `services/purchases.ts`
      (RevenueCat key guard, configure/re-identify, purchase-cancel). ✓
- [x] CI added — `.github/workflows/ci.yml` runs backend `go vet`/`build`/
      `test` and mobile `npm ci`/`tsc --noEmit`/`jest` on push + PR to main.
      Also fixed pre-existing peer conflicts (expo-linking `^55`→`~8.0.12`,
      react-dom pinned to 19.1.0) so `npm ci` resolves without flags. ✓
- [ ] Conditional/ongoing compliance (COMPLIANCE.md): add a cookie/tracking
      policy only if analytics are introduced later; periodically check whether
      Anthropic offers a self-serve DPA on higher API plans.
- [x] Update CLAUDE.md TODO + DEPLOYMENT CHECKLIST to remove stale items
      (Insights placeholder, trigger-log rotation, eas.json creation) ✓
- [x] `backend/.env.example` updated — fixed stray "Echo", added
      `REVENUECAT_WEBHOOK_SECRET` (it was missing from the template) ✓
- [ ] Expo Go loading screen shows old soundwave icon despite `--clear` — `assets/icon.png`
      is correct; likely an Expo Go client cache issue. Investigate before TestFlight/Play
      internal track (won't affect production builds via EAS).
- [ ] **Terms versioning / re-acceptance** (TERMS_OF_SERVICE.md §14 [TODO]): only
      `terms_accepted_at` is stored, no `terms_version`. If you later change the
      Terms and need re-acceptance, add a `terms_version` column + re-prompt flow.
      Nice-to-have; not a launch blocker.
- [ ] **Reconcile the Go version in docs** — `backend/go.mod` requires
      `go 1.25.0`, but `CLAUDE.md` Stack says "Go 1.22+ … x/crypto pinned for
      Go 1.22 compatibility". A dev on 1.22 can't build. Decide the real minimum
      (go.mod is authoritative) and fix CLAUDE.md + the crypto-pin note to match.

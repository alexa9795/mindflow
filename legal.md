# MindFlow — Legal & Privacy Handoff

> Context document for a future agent (or the lawyer doing the paid review).
> Captures the legal review of the privacy policy done on **2026-06-20**, the
> decisions made, and what is still open. Companion files:
> `PRIVACY_POLICY.md` (the policy itself) and `COMPLIANCE.md` (DPA/processor
> status). This app processes **mental-health journaling data = GDPR Art. 9
> special-category data**, which raises the bar for everything below.

---

## 1. Decisions made (2026-06-20)

| Topic | Decision |
|---|---|
| **Public app name** | **MindFlow** everywhere (stores + legal). Domain mindflowjournal.app already owned. Distinctive and trademarkable. The in-app AI companion is a feature of MindFlow — no separate persona name. |
| **Billing** | **Apple In-App Purchase + Google Play Billing** only (subscription is consumed in-app → Apple Guideline 3.1.1 mandates this; Stripe not allowed for in-app digital subs). We never receive card data; we only get subscription status. Qualifies for Apple/Google 15% small-business rate (<$1M/yr). |
| **Legal entity** | **STILL OPEN** — see §3 below. Determines who the data controller is. |

---

## 2. What was changed in this session

Updated `PRIVACY_POLICY.md` (now v1.1) and `COMPLIANCE.md`:

- Confirmed MindFlow branding (single name for the app and its AI companion).
- Added **Apple/Google as payment processors** (policy §3.3, §6.4); stated we
  never receive card data.
- Reframed journal entries/mood as relying on **explicit consent Art. 9(2)(a)**
  for *storage* (was only Contract Art. 6(1)(b)) — see open item §4.1.
- Added **profiling disclosure** (policy §3.4): mood/pattern detection, word
  frequency, trigger-word crisis detection; stated no Art. 22 decision.
- Added **biometric (Face ID) line** (policy §3.1): biometric data never leaves
  device.
- Added **UK/ICO** supervisory authority + UK Art. 27 representative TODO.
- Added **international transfer** general clause + TIA/DPF TODO.
- Made Anthropic "no training on inputs" explicit; flagged retention-window TODO.
- Updated contact email to **privacy@** (was hello@); flagged it must be set up.
- Removed the personal-name-only controller; replaced with entity-decision TODO.

Every unresolved point is marked **[TODO]** inline in `PRIVACY_POLICY.md` and
tracked in `COMPLIANCE.md` ("Outstanding Before EU Public Launch" + GDPR table).

---

## 3. OPEN: Legal entity — individual (autónomo) vs Spanish SL

The single biggest open decision. Sets the data controller, liability, and
how clean a future acquisition is. The user mentioned **acquisition is a
possible goal**, and the app handles **special-category mental-health data** —
both push toward an SL.

**Autónomo (sole trader)** — cheap, fast, simple, but **unlimited personal
liability** (personal assets exposed to data-breach/GDPR-fine/AI-harm claims),
user's name publicly listed as controller, messy to sell, autónomo cuota owed
regardless of revenue.

**Spanish SL (Sociedad Limitada)** — **limited liability (ring-fences personal
assets — decisive for a mental-health app)**, clean for acquisition (sell
shares/assets in one entity holding IP + DPAs + store account), professional
identity, tax flexibility (15% reduced corp rate first 2 profitable years).
Costs: share capital (now reducible toward €1 under 2022 "Crea y Crece" law,
with reserve nuances), notary/registry ~€300–800, ongoing bookkeeping +
annual accounts + gestor (~€60–150/mo), still pay autónomo societario.

**Recommendation given:** Given special-category data + acquisition goal, the
SL's liability shield and clean exit are worth the overhead. Pragmatic path:
either incorporate now (cleanest — sign App Store account, DPAs, policy as the
SL from day one) or launch as autónomo to validate then incorporate **before**
revenue/scale/acquisition talks — but note DPAs (Anthropic/Railway/Resend) are
currently signed in **Alexandra's personal name** and would need reassigning to
the SL, so deciding before launch avoids migration pain.

**Action:** User to decide. Then finalise `PRIVACY_POLICY.md` §1 + §12
controller identity, and re-sign/assign DPAs if SL.

---

## 4. OPEN items still needing work (priority order)

### 4.1 Art. 9 storage consent — IMPLEMENTED 2026-06-20
Done. Explicit storage consent (Art. 9(2)(a)) is now captured at registration,
separate from AI consent. Changes:
- **Migration** `backend/internal/db/migrations/024_add_journaling_consent.sql`
  — adds `users.journaling_consent_given_at`, backfills existing rows to
  `created_at` (safe pre-launch).
- **Backend** `RegisterRequest.ConsentToStorage` (`consent_to_storage` JSON);
  handler rejects registration with 400 if not true; `CreateUser` stamps the
  timestamp; new audit action `account.journaling_consent`; field added to
  `/me` response and to the GDPR data export.
- **Mobile** required consent checkbox on `app/(auth)/register.tsx`, threaded
  through `useAuth.register` → `api.register(..., consentToStorage)`;
  `User.journaling_consent_given_at` added.
- Tests updated; `go test ./internal/auth/... ./internal/export/...` and
  `npx tsc --noEmit` pass.

Remaining: run migration 024 against the DB; have the paid legal review
confirm the consent wording on the signup checkbox and policy §5. Consider
linking the checkbox "Privacy Policy" text to the live URL once published.

### 4.1b Terms of Service acceptance — MECHANISM IMPLEMENTED 2026-06-20
Acceptance is captured at registration via a **separate** checkbox (kept
distinct from the Art. 9 storage consent so the GDPR consent stays "freely
given, specific" and unbundled). Changes mirror the storage consent:
- **Migration** `025_add_terms_accepted.sql` — adds `users.terms_accepted_at`,
  backfills existing rows to `created_at`.
- **Backend** `RegisterRequest.AcceptTerms` (`accept_terms`); handler returns
  400 if not true; `CreateUser` stamps `terms_accepted_at`; new audit action
  `account.terms_accepted`; field in `/me` and data export.
- **Mobile** second required checkbox on the signup screen, threaded through
  `useAuth.register` → `api.register(..., consentToStorage, acceptTerms)`;
  `User.terms_accepted_at` added.
- Tests updated (added "missing terms acceptance returns 400"); backend tests
  and `tsc --noEmit` pass.

### 4.1c Terms of Service document — DRAFTED 2026-06-20
Draft created at `TERMS_OF_SERVICE.md` (DRAFT-with-TODOs style, matching the
privacy policy). Covers: provider identity, eligibility (16+), service
description, **AI companion no-medical-advice disclaimer + crisis**, account
responsibilities, acceptable use, **Your Content ownership + limited operating
licence**, **subscriptions/billing (Apple/Google IAP, auto-renewal,
store-handled refunds, price changes)**, IP, privacy cross-reference,
suspension/termination + inactivity deletion, disclaimers, **limitation of
liability** (with EU mandatory-rights carve-outs), changes, **governing law
(Spain)** + EU consumer-rights preservation, contact.

Still OPEN before publish:
- **Entity decision** — fills provider name/address (§1) and governing law (§15).
- **Billing terms** — finalise renewal periods, prices, free-tier limits, trial
  terms, EU digital-withdrawal-right wording once Apple/Google IAP is set up
  (§8 TODO). Confirm own-EULA vs Apple's standard Licensed Application EULA.
- **Publish** at a stable URL (e.g. mindflowjournal.app/terms) and link the
  signup checkbox's "Terms of Service" text to it.
- **`terms_version`** field not implemented (only `terms_accepted_at`); add if
  you plan to revise and re-prompt for acceptance.
- **Set up** support@ and privacy@ mailboxes.
- **Paid legal review** — review ToS together with the privacy policy.

### 4.2 Verify profiling behaviour (policy §3.4)
Confirm live behaviour of pattern detection + trigger-word detection matches
the policy: only metadata logged (never content), purpose is insights/crisis
support, and no Art. 22 automated decision with legal/significant effect.
(Recent commit "pattern detection backend" — feature is in progress.)

### 4.3 DPIA (Art. 35)
Not done. Large-scale special-category data + profiling is a textbook DPIA
trigger. Draft one before/around launch — regulators expect it for a
mental-health app.

### 4.4 UK Article 27 representative
DPAs include UK Addendums → likely targeting UK users. EU controller serving
UK users may need a UK representative under UK GDPR Art. 27. Assess; appoint
if yes. ICO already added to policy §7.

### 4.5 Transfer Impact Assessment + DPF
Document a short TIA for US transfers of special-category data (Anthropic,
Railway, Resend). Check if each is EU–US Data Privacy Framework certified and
reference it if so.

### 4.6 Anthropic retention window
Policy §6.1 currently links out. For health data, state the concrete API
retention window and whether zero-data-retention is available on the plan.

### 4.7 Store-side compliance
- App Store **App Privacy** label + Google Play **Data Safety** form must be
  completed and **consistent with the policy**.
- **Google Play Health Apps** policy / sensitive-data declaration likely
  triggered by mood/mental-health data — review requirements.
- Set **age rating to 16+** to match policy §9; keep out of kids/family category.
- `NSFaceIDUsageDescription` present for Face ID (Apple requires it).

### 4.8 Housekeeping before publish
- Set up and monitor **privacy@mindflowjournal.app** (not yet configured).
- Remove DRAFT banner + set effective date once entity + legal review done.
- Paid legal review (~€150) — do this **last**, after the above are settled, so
  the reviewer signs off a near-final draft rather than catching basics.

---

## 5. What's already solid (don't re-do)
In-app account deletion, JSON data export (Art. 20), AI consent modal +
timestamp, consent withdrawal, concrete 12-month inactivity-deletion schedule,
named processors with DPA references (Anthropic/Railway/Resend signed
2026-05-07), crisis-support disclaimer, "not a therapist" AI disclaimer language,
bcrypt + hashed tokens + HTTPS security section. Structure is above typical
indie-app standard — remaining work is refinement, not a rewrite.

---

*Not formal legal advice. The paid review (~€150) is still required for
sign-off; the items above are meant to get the draft clean first.*

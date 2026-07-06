# MindFlow — Compliance Notes

> **Branding decision (2026-06-20):** Public app name is **MindFlow**
> (App Store + Google Play). The in-app AI companion is a feature of MindFlow
> (no separate persona name). Use "MindFlow" in all legal/store identity.
> Domain mindflowjournal.app already owned.
>
> **Billing decision (2026-06-20):** Subscriptions via **Apple In-App
> Purchase + Google Play Billing** only. No Stripe for in-app digital
> subscriptions (Apple Guideline 3.1.1). We never receive card data.
>
> **Entity decision: OPEN.** Individual (autónomo) vs Spanish SL still to
> be decided — this sets the data controller identity. See legal.md.

## Anthropic Data Processing Agreement

**Status:** ✅ Accepted  
**Date:** 2026-05-07  
**Method:** Automatically incorporated into Anthropic's Commercial Terms on API account creation.

Anthropic acts as a data processor for AI inference. The DPA includes Standard Contractual Clauses (SCCs) covering cross-border data transfers outside the EEA.

- DPA document: https://www.anthropic.com/legal/dpa
- Commercial Terms: https://www.anthropic.com/legal/commercial-terms
- Confirmed via Anthropic privacy team email on 2026-05-07

**Required in privacy policy:** State that Anthropic is a data processor, that journal content is processed by the Claude API for AI responses, and that EEA transfers are covered by SCCs per Anthropic's DPA.

---

## GDPR Status

| Requirement | Status | Notes |
|---|---|---|
| Art. 20 export | ✅ | Entries, messages, audit events, profile, ai_consent_given_at |
| Art. 17 deletion | ✅ | Cascade + audit anonymisation |
| Art. 9 AI consent | ✅ | Consent modal on first AI companion use, ai_consent_given_at timestamp |
| Art. 28 DPA (Anthropic) | ✅ | Via Commercial Terms + SCCs, confirmed by Anthropic privacy team 2026-05-07 |
| Art. 28 DPA (Railway) | ✅ | DocuSign signed 2026-05-07 (Envelope ID: A46F8A56-B730-4646-B1F9-11AC7962BDB2), includes EU SCCs (Module 2) + UK Addendum |
| Art. 28 DPA (Resend) | ✅ | Binding on ToS acceptance. Pre-signed DPA downloaded 2026-05-07 from resend.com/settings/documents, includes EU SCCs + UK Addendum |
| Art. 9 consent — storage | ✅ | Implemented 2026-06-20 (migration 024). Required checkbox at signup, enforced server-side, stored as `journaling_consent_given_at`, audited (`account.journaling_consent`), included in export. Pending paid legal review. |
| Terms of Service acceptance | ⚠️ | Acceptance mechanism implemented 2026-06-20 (migration 025): separate required checkbox, enforced server-side, stored as `terms_accepted_at`, audited (`account.terms_accepted`), in export. Draft document now exists in TERMS_OF_SERVICE.md — still needs entity decision, billing terms, paid legal review, and a live URL before launch. |
| Art. 9 consent — AI | ✅ | Consent modal on first AI companion use, ai_consent_given_at timestamp |
| Profiling disclosure (Art. 13(2)(f)/22) | ⚠️ | Pattern detection + trigger-word detection now disclosed in policy §3.4. Verify live behaviour matches (metadata-only logging, no Art. 22 decision). |
| DPIA (Art. 35) | ❌ | Not yet done. Special-category data + profiling = likely DPIA trigger. Draft one before/around launch. |
| UK Art. 27 representative | ❌ | DPAs include UK Addendums → likely targeting UK users. Assess need for UK representative. |
| Privacy policy | ⚠️ | v1.1 draft in PRIVACY_POLICY.md updated 2026-06-20. Still needs: entity decision, paid legal review (~€150), and live URL before App Store submission |

---

## Data Processors

### Anthropic
- **Role:** Processor (AI inference)
- **Data processed:** Journal entry content sent to Claude API for AI companion responses
- **Transfer mechanism:** SCCs incorporated into Commercial Terms
- **DPA:** https://www.anthropic.com/legal/dpa

### Railway
- **Role:** Processor (hosting + database)
- **Data processed:** All user personal data including special category data (Art. 9 — journal content)
- **Transfer mechanism:** EU SCCs Module 2 (Controller to Processor) + UK Addendum
- **DPA signed:** 2026-05-07, DocuSign Envelope ID: A46F8A56-B730-4646-B1F9-11AC7962BDB2
- **Railway signed by:** Christian Ohrgaard, Head of Operations
- **Customer signed by:** Alexandra Tomulescu, Owner
- **Note:** Railway infrastructure runs on Google Cloud Platform (US). Database encrypted at rest.

### Resend
- **Role:** Processor (transactional email)
- **Data processed:** User email addresses (password reset, inactivity warnings)
- **Transfer mechanism:** EU SCCs + UK Addendum
- **DPA binding:** On ToS acceptance (pre-signed by Zeno Rocha Bueno Netto, CEO, 2026-01-14)
- **DPA downloaded:** 2026-05-07 from resend.com/settings/documents
- **Data stored:** United States

### Apple / Google (Payments)
- **Role:** Payment processors (in-app subscriptions)
- **Data processed:** Payment card data handled entirely by Apple/Google; we
  receive only subscription status (tier, active/lapsed). We never receive or
  store card details.
- **Mechanism:** Apple In-App Purchase + Google Play Billing under their own
  terms/privacy policies.
- **Note:** Disclosed in privacy policy §3.3 and §6.4. No separate DPA needed
  (they are independent controllers for the payment transaction).

---

## Technical Safeguards (MindFlow application layer)

- HTTPS/HSTS enforced on all endpoints
- JWT tokens: 15-minute access tokens, 7-day refresh tokens with rotation
- Passwords: bcrypt hashed
- Refresh tokens: SHA-256 hashed before DB storage
- Password reset tokens: SHA-256 hashed before DB storage
- Journal content: never logged
- AI trigger word detection: logged as metadata only, never content
- Rate limiting: all auth and AI endpoints
- DB connection: encrypted in transit

---

## Outstanding Before EU Public Launch

- [x] Domain purchased: mindflowjournal.app (Porkbun, expires 2027-05-25)
- [x] Resend verified sender: noreply@mindflowjournal.app (Ireland eu-west-1)
- [x] Privacy policy published at https://mindflowjournal.app/privacy.html
- [ ] **Legal entity decision** (autónomo vs Spanish SL) — sets data controller
- [ ] **Paid legal review of privacy policy** (~€150)
- [x] **Art. 9 storage consent** captured at signup (migration 024, 2026-06-20)
- [x] **Terms of Service acceptance** captured at signup (migration 025, 2026-06-20)
- [x] **Draft the Terms of Service document** (TERMS_OF_SERVICE.md, 2026-06-20)
- [ ] **Finalise & publish the Terms of Service** at a live URL (entity + billing terms + legal review, then link the signup checkbox to it)
- [ ] **Verify profiling/trigger-word behaviour** matches policy §3.4
- [ ] **DPIA** drafted (Art. 35)
- [ ] **UK Art. 27 representative** assessed/appointed if targeting UK
- [ ] **Transfer Impact Assessment (TIA)** for US processors documented
- [ ] **Anthropic API retention window** confirmed and stated in policy §6.1
- [ ] **App Store / Play age rating** set to 16+ to match policy §9
- [ ] **App Privacy / Data Safety forms** completed and consistent with policy
- [ ] **Google Play Health Apps declaration** (mood/mental-health data) reviewed
- [ ] Contact email privacy@mindflowjournal.app set up
- [ ] Cookie/tracking policy (only if analytics are added later)
- [ ] Anthropic DPA: monitor for self-serve DPA option on higher API plans

---

## Document Storage

Physical copies of signed DPAs should be stored securely outside the repository (e.g. Google Drive) in addition to this reference file.

- Railway DPA (signed): `Railway_Corporation_Data_Processing_Addendum.pdf`
- Resend DPA (pre-signed): `resend-dpa-signed.pdf`
- Anthropic DPA: https://www.anthropic.com/legal/dpa (no separate signed document — incorporated via ToS)
# MindFlow — Compliance Notes

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
| Art. 9 AI consent | ✅ | Consent modal on first Echo tap, ai_consent_given_at timestamp |
| Art. 28 DPA (Anthropic) | ✅ | Via Commercial Terms + SCCs, confirmed by Anthropic privacy team 2026-05-07 |
| Art. 28 DPA (Railway) | ✅ | DocuSign signed 2026-05-07 (Envelope ID: A46F8A56-B730-4646-B1F9-11AC7962BDB2), includes EU SCCs (Module 2) + UK Addendum |
| Art. 28 DPA (Resend) | ✅ | Binding on ToS acceptance. Pre-signed DPA downloaded 2026-05-07 from resend.com/settings/documents, includes EU SCCs + UK Addendum |
| Privacy policy | ❌ | Draft exists in PRIVACY_POLICY.md — requires legal review (~€150) and a live URL before App Store submission |

---

## Data Processors

### Anthropic
- **Role:** Processor (AI inference)
- **Data processed:** Journal entry content sent to Claude API for Echo responses
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
- [ ] Privacy policy published at https://mindflowjournal.app/privacy
- [ ] Contact email privacy@mindflowjournal.app set up
- [ ] Cookie/tracking policy (only if analytics are added later)
- [ ] Anthropic DPA: monitor for self-serve DPA option on higher API plans

---

## Document Storage

Physical copies of signed DPAs should be stored securely outside the repository (e.g. Google Drive) in addition to this reference file.

- Railway DPA (signed): `Railway_Corporation_Data_Processing_Addendum.pdf`
- Resend DPA (pre-signed): `resend-dpa-signed.pdf`
- Anthropic DPA: https://www.anthropic.com/legal/dpa (no separate signed document — incorporated via ToS)
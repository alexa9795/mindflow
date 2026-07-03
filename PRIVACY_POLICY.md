> ⚠️ DRAFT — not yet publishable. Two blockers remain: (1) legal-entity
> decision (individual vs Spanish SL) determines the data controller named
> below; (2) final paid legal review (~€150). See open TODOs marked
> **[TODO]** and the handoff in legal.md. Estimated legal review cost: ~€150.

# Privacy Policy — MindFlow

> **App name:** MindFlow (this is the name users see in the App Store and
> Google Play). The in-app AI companion is a feature of MindFlow —
> it is not a separate product or company.

**Last updated:** 2026-06-20
**Effective date:** [PLACEHOLDER — set to publication date]
**Version:** 1.1 (pre-release draft)

---

## 1. Who We Are

MindFlow is a personal AI journaling application.

> **[TODO — ENTITY DECISION PENDING]** The data controller is either
> Alexandra Tomulescu (sole trader / autónomo) **or** a Spanish Sociedad
> Limitada (SL) to be incorporated. This section must be finalised once the
> entity is chosen, because it determines who is legally the controller,
> the liability position, and the contact/registration details below.
> See legal.md for the pros/cons analysis.

The data controller is:

**[Alexandra Tomulescu — sole trader] / [MindFlow SL — to be confirmed]**
Valencia, Spain (EU)
Email: privacy@mindflowjournal.app

As a data controller established within the European Union, we are
responsible for your personal data under the EU General Data Protection
Regulation (GDPR) (Regulation 2016/679).

---

## 2. What This Policy Covers

This policy explains what personal data MindFlow collects, why, how it is used, who it is shared with, and what rights you have. It applies to all users of the MindFlow mobile application and its backend services.

---

## 3. Data We Collect and Why

### 3.1 Account Data

| Data | Purpose | Legal Basis |
|---|---|---|
| Name | Identify your account | Contract (Art. 6(1)(b)) |
| Email address | Account authentication, transactional notifications | Contract (Art. 6(1)(b)) |
| Password (hashed, never stored in plain text) | Authentication | Contract (Art. 6(1)(b)) |
| Account creation timestamp | Account management | Contract (Art. 6(1)(b)) |

**Biometric login (Face ID / Touch ID / Android biometrics):** If you enable
biometric unlock, authentication is performed entirely by your device's
operating system (e.g. Apple's Secure Enclave). Your biometric data **never
leaves your device, is never transmitted to us, and is never stored on our
servers.** We only receive a confirmation from the device that authentication
succeeded.

### 3.2 Journal Content (Special Category Data)

| Data | Purpose | Legal Basis |
|---|---|---|
| Journal entries (text) | Core app functionality — personal journaling | **Explicit consent (Art. 9(2)(a))** + Contract (Art. 6(1)(b)) |
| Mood scores | Mood tracking and trends | **Explicit consent (Art. 9(2)(a))** + Contract (Art. 6(1)(b)) |
| AI conversation messages | AI companion responses | **Explicit consent (Art. 9(2)(a))** + Contract (Art. 6(1)(b)) |
| Journaling consent timestamp | Record of your consent to store sensitive content | Legal obligation / consent record (Art. 6(1)(c)) |
| AI consent timestamp (`ai_consent_given_at`) | Record that you consented to AI processing | Legal obligation / consent record (Art. 6(1)(c)) |

**Important:** Journal entries and mood scores may contain information about
your mental health, emotional state, and personal wellbeing. This is special
category data under GDPR Art. 9. Because of this, **we store and process this
content only on the basis of your explicit consent**, which you give when you
create your account / write your first entry, separately from your consent to
AI processing. See Section 5.

> **[IMPLEMENTED 2026-06-20 — pending review]** Explicit storage consent is
> now captured at registration: a required checkbox on the signup screen,
> enforced server-side (registration is rejected without it), recorded as
> `users.journaling_consent_given_at` and in the audit trail
> (`account.journaling_consent`), and included in the data export. Migration
> 024. Still to verify in the paid legal review.

### 3.3 Subscription and Usage Data

| Data | Purpose | Legal Basis |
|---|---|---|
| Subscription tier (free / premium) | Enforce feature limits | Contract (Art. 6(1)(b)) |
| Monthly usage counts (AI messages, entries) | Enforce plan quotas | Contract (Art. 6(1)(b)) |
| Purchase/subscription status from the app store | Activate and manage your subscription | Contract (Art. 6(1)(b)) |

Subscriptions are sold and processed exclusively through **Apple In-App
Purchase** (iOS) and **Google Play Billing** (Android). **We never receive,
process, or store your payment card details.** Payment is handled entirely by
Apple or Google under their own privacy policies. We receive only your
subscription status (active / lapsed / tier) to unlock features.

### 3.4 Automated Analysis of Your Content (Profiling)

To provide the app's insights and safety features, we perform automated
analysis of your journal content:

| Processing | Purpose | Legal Basis |
|---|---|---|
| Mood trend and pattern detection | Show you trends and recurring themes in your entries (Insights screen) | **Explicit consent (Art. 9(2)(a))** |
| Word/theme frequency analysis | Surface common themes in your journaling | **Explicit consent (Art. 9(2)(a))** |
| Trigger-word detection (crisis-support signals) | Detect language that may indicate distress, so we can surface crisis-support resources. Only metadata is logged — never your entry content | **Explicit consent (Art. 9(2)(a))** / vital interests where applicable |

This analysis is used **only to provide features to you**. It does **not**
produce any decision that has legal or similarly significant effects on you
within the meaning of GDPR Art. 22, and it is never used for advertising,
credit, insurance, or sharing with third parties.

> **[TODO — VERIFY]** Confirm the live behaviour of pattern detection and
> trigger-word detection matches this description before publishing
> (purpose, that only metadata — not content — is logged, and that no
> Art. 22 automated decision is made). See legal.md.

### 3.5 Security Audit Logs

| Data | Purpose | Legal Basis |
|---|---|---|
| Audit events (login, account deletion, data export, consent changes) | Security, fraud detection, regulatory accountability | Legitimate interest (Art. 6(1)(f)) |
| Timestamps and event types | Audit trail integrity | Legitimate interest (Art. 6(1)(f)) |

Audit log records are retained after account deletion in anonymised form (user identifiers removed). The legitimate interest pursued is detection of unauthorised access and demonstration of GDPR compliance obligations.

---

## 4. How Long We Keep Your Data

### Active Accounts

Your data is retained for as long as your account remains active.

### Inactive Accounts — Automatic Deletion

MindFlow implements automatic data deletion for inactive accounts:

- **At 11 months of inactivity:** Email warning sent advising that your account and data will be deleted in 30 days unless you log in.
- **At 11.5 months of inactivity:** Final email warning sent.
- **At 12 months of inactivity:** Account and all personal data are permanently deleted. This deletion cascades to journal entries, AI conversation messages, mood scores, and profile data.

### After Deletion

When an account is deleted (either by you or by the inactivity policy):
- All journal entries, messages, mood data, and profile data are permanently deleted.
- Audit log records are **anonymised** (your user ID is removed) rather than deleted, to preserve security audit integrity. We retain only data fields that cannot, alone or in combination, re-identify you.

---

## 5. Special Category Data — Mental Health and Wellbeing (Art. 9)

Journal entries and mood scores may contain information about your mental
health, emotional state, personal wellbeing, or other sensitive topics. Under
GDPR Art. 9, this is special category data requiring explicit consent.

**We rely on your explicit consent (Art. 9(2)(a)) at two points:**

1. **To store and process your sensitive journal content at all** — given
   when you create your account / write your first entry.
2. **To process that content with AI** — given separately when you first
   interact with MindFlow's AI companion.

When you first interact with MindFlow's AI companion, you are shown a consent modal explaining
that your journal content will be sent to Anthropic's Claude API for AI
responses. You must actively consent before any AI processing occurs. Your
consent timestamp is recorded.

**You can withdraw either consent at any time** via Settings → Privacy.
Withdrawing AI consent stops new entries from being sent to the AI; it does
not delete previously generated AI responses. Withdrawing your consent to
store sensitive content means we can no longer provide the journaling service,
and you may export and/or delete your data.

**We will never:**
- Sell your journal content
- Use your journal content for advertising
- Share your journal content with third parties except as described in Section 6

---

## 6. Data Processors (Third Parties)

We share data with the following processors under written agreements. They act on our instructions and may not use your data for their own purposes.

### 6.1 Anthropic (AI Inference)

**What is shared:** The text of your journal entries and AI conversation messages, when you interact with MindFlow's AI companion and have given AI consent.

**Purpose:** Generating AI companion responses via the Claude API.

**Legal basis for transfer:** Standard Contractual Clauses (SCCs) incorporated into Anthropic's Commercial Terms of Service, covering transfers of EEA personal data to the United States.

**DPA reference:** https://www.anthropic.com/legal/dpa

**Anthropic's data use:** Anthropic processes your content solely to provide
the API response. Under Anthropic's Commercial Terms, API inputs and outputs
are **not used to train their models**.

> **[TODO — CONFIRM RETENTION]** State Anthropic's concrete API retention
> window (default retention, and any longer retention for trust & safety),
> and whether zero-data-retention is available on the current API plan.
> Given this is special-category data, be specific rather than linking out.

### 6.2 Railway (Hosting and Database)

**What is shared:** All personal data stored in MindFlow's PostgreSQL database (account data, journal entries, audit logs).

**Purpose:** Cloud hosting of the MindFlow backend API and PostgreSQL database.

**DPA status:** Signed 2026-05-07 via DocuSign. Includes EU SCCs (Module 2, Controller to Processor) and UK Addendum. Data stored in the United States on Google Cloud Platform infrastructure. Database encrypted at rest.

### 6.3 Resend (Transactional Email)

**What is shared:** Your email address and the content of transactional emails (inactivity warnings, account notifications).

**Purpose:** Sending system emails (inactivity warnings, account notifications).

**DPA status:** Binding on Terms of Service acceptance. Pre-signed DPA includes EU SCCs and UK Addendum. Data stored in the United States.

### 6.4 Apple and Google (Payment Processing)

**What is shared:** Subscription purchase and status information. Payment card
details are collected and processed **directly by Apple and Google** — we
never receive them.

**Purpose:** Processing in-app subscription purchases via Apple In-App
Purchase and Google Play Billing.

**Privacy policies:** Apple (https://www.apple.com/legal/privacy/) and Google
(https://policies.google.com/privacy).

### International Transfers — General

Anthropic, Railway, and Resend process data in the United States. Transfers
rely on Standard Contractual Clauses (and, where applicable, the EU–US Data
Privacy Framework). We have assessed these transfers and apply the safeguards
described in each processor's DPA.

> **[TODO]** Complete and document a short Transfer Impact Assessment (TIA)
> for US transfers of special-category data, and confirm whether each
> processor is DPF-certified (and reference it if so). See legal.md.

---

## 7. Your Rights Under GDPR

You have the following rights. All are exercisable directly within the app or by emailing privacy@mindflowjournal.app.

| Right | How to exercise                                                                                                                                          |
|---|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Art. 15 — Right of access** | Request a copy of all data we hold about you                                                                                                             |
| **Art. 20 — Right to data portability** | Settings → Export Data → downloads a JSON file containing your entries, messages, audit events, profile, and consent timestamp                           |
| **Art. 17 — Right to erasure** | Settings → Delete Account → permanently deletes your account and all associated personal data. Audit records are anonymised, not deleted (see Section 4) |
| **Art. 21 — Right to object (AI processing)** | Settings → Privacy → AI Processing toggle — disables AI processing of your content                                                                       |
| **Art. 7(3) — Right to withdraw consent** | Settings → Privacy — withdraw journaling and/or AI consent at any time                                                                   |
| **Art. 16 — Right to rectification** | Email privacy@mindflowjournal.app to correct inaccurate data                                                                                             |
| **Art. 18 — Right to restriction** | Email privacy@mindflowjournal.app to request restriction of processing                                                                                               |
| **Art. 22 — Automated decisions** | We do not make decisions with legal or similarly significant effects about you by automated means (see Section 3.4)                                       |

**Response time:** We will respond to rights requests within **30 days** as required by GDPR Art. 12.

**Supervisory authority (EU):** If you believe we have not handled your data
lawfully, you may lodge a complaint with your local EU supervisory authority,
or with the Spanish authority where we are established:

**Agencia Española de Protección de Datos (AEPD)**
Website: https://www.aepd.es
Address: C/ Jorge Juan, 6, 28001 Madrid, Spain

**Supervisory authority (UK):** UK users may complain to the Information
Commissioner's Office (ICO), https://ico.org.uk.

> **[TODO — UK]** If MindFlow targets UK users (our DPAs include UK
> Addendums, which suggests yes), assess whether a UK Article 27
> representative is required and appoint one if so. See legal.md.

---

## 8. Mental Health and Crisis Support

MindFlow is a journaling and personal reflection tool. **MindFlow's AI companion is not a therapist, psychologist, or medical professional. It does not provide medical advice, diagnosis, or treatment.**

If you are in distress or experiencing a mental health crisis, please seek professional support. The app links to **findahelpline.com**, an international directory of crisis support resources.

---

## 9. Children

MindFlow is not intended for use by persons under the age of 16. We do not
knowingly collect personal data from children. If you believe a child has
registered an account, please contact privacy@mindflowjournal.app and we will
delete the account promptly.

> **[TODO — STORE RATING]** Ensure the App Store and Google Play age
> ratings are set to 16+ (or higher) to match this clause, and that the app
> is not listed in any children/family category.

---

## 10. Security

We implement the following technical and organisational measures to protect your data:

- Passwords are stored as bcrypt hashes and never in plain text
- All data in transit is encrypted via HTTPS/TLS
- Access and refresh tokens are short-lived and cryptographically hashed before storage
- Database access is restricted to the application backend
- Security events are logged in an audit trail
- Railway's infrastructure (database host) encrypts data at rest

---

## 11. Changes to This Policy

If we make material changes to this policy, we will notify you by email and/or an in-app notice at least 30 days before the changes take effect. Continued use of MindFlow after the effective date constitutes acceptance of the updated policy.

The current version of this policy is always available within the app and at https://mindflowjournal.app/privacy.

---

## 12. Contact

For any questions about this policy or to exercise your rights:

**[Data controller — see Section 1 TODO]**
Email: privacy@mindflowjournal.app

> **[TODO]** Set up and monitor privacy@mindflowjournal.app before
> publishing (currently not yet configured per COMPLIANCE.md).

---

*MindFlow — your private journaling companion.*

> ⚠️ DRAFT — requires legal review before publication. Estimated legal review cost: ~€150.

# Privacy Policy — MindFlow

**Last updated:** 2026-05-07  
**Effective date:** [PLACEHOLDER — set to publication date]  
**Version:** 1.0 (pre-release draft)

---

## 1. Who We Are

MindFlow is a personal AI journaling application. The data controller is:

**Alexandra Tomulescu**  
Valencia, Spain (EU)  
Email: privacy@mindflowjournal.app

As a sole trader operating within the European Union, Alexandra Tomulescu is the data controller responsible for your personal data under the EU General Data Protection Regulation (GDPR) (Regulation 2016/679).

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

### 3.2 Journal Content

| Data | Purpose | Legal Basis |
|---|---|---|
| Journal entries (text) | Core app functionality — personal journaling | Contract (Art. 6(1)(b)) |
| Mood scores | Mood tracking and trends | Contract (Art. 6(1)(b)) |
| Echo AI conversation messages | AI companion responses | Contract (Art. 6(1)(b)) |
| AI consent timestamp (`ai_consent_given_at`) | Record that you consented to AI processing | Legal obligation / consent record (Art. 6(1)(c)) |

**Important:** Journal entries may contain information about your mental health, emotional state, and personal wellbeing. This is special category data under GDPR Art. 9. See Section 5 below.

### 3.3 Subscription and Usage Data

| Data | Purpose | Legal Basis |
|---|---|---|
| Subscription tier (free / premium) | Enforce feature limits | Contract (Art. 6(1)(b)) |
| Monthly usage counts (AI messages, entries) | Enforce plan quotas | Contract (Art. 6(1)(b)) |

### 3.4 Security Audit Logs

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
- Audit log records are **anonymised** (your user ID is removed) rather than deleted, to preserve security audit integrity.

---

## 5. Special Category Data — Mental Health and Wellbeing (Art. 9)

Journal entries may contain information about your mental health, emotional state, personal wellbeing, or other sensitive topics. Under GDPR Art. 9, this is classified as special category data requiring explicit consent for AI processing.

**We process this data by AI only with your explicit consent.**

When you first interact with Echo (the AI companion), you are shown a consent modal explaining that your journal content will be sent to Anthropic's Claude API for AI responses. You must actively consent before any AI processing occurs. Your consent timestamp is recorded.

**You can withdraw this consent at any time** via Settings → Privacy → AI Processing. Withdrawing consent stops new entries from being sent to the AI. It does not delete previously generated AI responses.

**We will never:**
- Sell your journal content
- Use your journal content for advertising
- Share your journal content with third parties except as described in Section 6

---

## 6. Data Processors (Third Parties)

We share data with the following processors under written agreements. They act on our instructions and may not use your data for their own purposes.

### 6.1 Anthropic (AI Inference)

**What is shared:** The text of your journal entries and AI conversation messages, when you interact with Echo and have given AI consent.

**Purpose:** Generating AI companion responses via the Claude API.

**Legal basis for transfer:** Standard Contractual Clauses (SCCs) incorporated into Anthropic's Commercial Terms of Service, covering transfers of EEA personal data to the United States.

**DPA reference:** https://www.anthropic.com/legal/dpa

**Anthropic's data use:** Anthropic processes your content solely to provide the API response. Refer to Anthropic's privacy policy for their data retention practices on API inputs.

### 6.2 Railway (Hosting and Database)

**What is shared:** All personal data stored in MindFlow's PostgreSQL database (account data, journal entries, audit logs).

**Purpose:** Cloud hosting of the MindFlow backend API and PostgreSQL database.

**DPA status:** Signed 2026-05-07 via DocuSign. Includes EU SCCs (Module 2, Controller to Processor) and UK Addendum. Data stored in the United States on Google Cloud Platform infrastructure. Database encrypted at rest.

### 6.3 Resend (Transactional Email)

**What is shared:** Your email address and the content of transactional emails (inactivity warnings, account notifications).

**Purpose:** Sending system emails (inactivity warnings, account notifications).

**DPA status:** Binding on Terms of Service acceptance. Pre-signed DPA includes EU SCCs and UK Addendum. Data stored in the United States.

---

## 7. Your Rights Under GDPR

You have the following rights. All are exercisable directly within the app or by emailing privacy@mindflowjournal.app.

| Right | How to exercise                                                                                                                                          |
|---|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Art. 15 — Right of access** | Request a copy of all data we hold about you                                                                                                             |
| **Art. 20 — Right to data portability** | Settings → Export Data → downloads a JSON file containing your entries, messages, audit events, profile, and consent timestamp                           |
| **Art. 17 — Right to erasure** | Settings → Delete Account → permanently deletes your account and all associated personal data. Audit records are anonymised, not deleted (see Section 4) |
| **Art. 21 — Right to object (AI processing)** | Settings → Privacy → AI Processing toggle — disables AI processing of your content                                                                       |
| **Art. 7(3) — Right to withdraw consent** | Same as Art. 21 above — withdraw AI consent at any time without affecting your account                                                                   |
| **Art. 16 — Right to rectification** | Email privacy@mindflowjournal.app to correct inaccurate data                                                                                             |
| **Art. 18 — Right to restriction** | Email privacy@mindflowjournal.app to request restriction of processing                                                                                               |

**Response time:** We will respond to rights requests within **30 days** as required by GDPR Art. 12.

**Supervisory authority:** If you believe we have not handled your data lawfully, you have the right to lodge a complaint with the Spanish data protection authority:

**Agencia Española de Protección de Datos (AEPD)**  
Website: https://www.aepd.es  
Address: C/ Jorge Juan, 6, 28001 Madrid, Spain

---

## 8. Mental Health and Crisis Support

MindFlow is a journaling and personal reflection tool. **Echo, the AI companion, is not a therapist, psychologist, or medical professional. Echo does not provide medical advice, diagnosis, or treatment.**

If you are in distress or experiencing a mental health crisis, please seek professional support. The app links to **findahelpline.com**, an international directory of crisis support resources.

---

## 9. Children

MindFlow is not intended for use by persons under the age of 16. We do not knowingly collect personal data from children. If you believe a child has registered an account, please contact privacy@mindflowjournal.app and we will delete the account promptly.

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

**Alexandra Tomulescu**  
Email: privacy@mindflowjournal.app  

---

*MindFlow — your private journaling companion.*
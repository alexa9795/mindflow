# Store Privacy Disclosure — Reference Answers

Prepared from the actual codebase (schema migrations, AI service, COMPLIANCE.md).
Use this as a copy-paste reference when filling out the forms in App Store Connect
and Google Play Console.

---

## Apple — App Privacy (Nutrition Label)

Fill in at: **App Store Connect → [your app] → App Privacy**.

### Does the app collect data?
**Yes.**

### Data types and purposes

#### 1. Contact Info

| Data type     | Collected | Linked to identity | Used for tracking |
|---------------|-----------|-------------------|-------------------|
| Email address | ✅ Yes    | ✅ Yes            | ❌ No             |
| Name          | ✅ Yes    | ✅ Yes            | ❌ No             |

- **Email** — required for account creation, login, password reset, and
  inactivity-warning emails.
- **Name** — display name shown in the app.
- **Purposes:** App Functionality.

#### 2. Health & Fitness — Health

| Data type | Collected | Linked to identity | Used for tracking |
|-----------|-----------|-------------------|-------------------|
| Health    | ✅ Yes    | ✅ Yes            | ❌ No             |

- **What it is:** mood scores (1–5 integer per journal entry) and free-text
  journal entries that may contain mental-health or emotional-wellbeing content.
- **Purposes:** App Functionality, Analytics (aggregated mood trends shown
  only to the user in the Insights screen — not shared).

> **Note for the form:** Apple's "Health" data type covers "health, exercise,
> or medical data." Mood tracking and wellbeing journaling fall here. Declare it.

#### 3. User Content — Other User Content

| Data type          | Collected | Linked to identity | Used for tracking |
|--------------------|-----------|-------------------|-------------------|
| Other user content | ✅ Yes    | ✅ Yes            | ❌ No             |

- **What it is:** free-text journal entries and AI conversation messages.
- **Third-party sharing:** journal entry text is sent to the Anthropic Claude API
  **only** when the user has explicitly opted in to AI responses (opt-in consent
  captured at first use; stored as `ai_consent_given_at`).
- **Purposes:** App Functionality.

#### 4. Identifiers — User ID

| Data type | Collected | Linked to identity | Used for tracking |
|-----------|-----------|-------------------|-------------------|
| User ID   | ✅ Yes    | ✅ Yes            | ❌ No             |

- **What it is:** internal UUID assigned at registration.
- **Purposes:** App Functionality.

#### 5. Purchases — Purchase History

| Data type        | Collected | Linked to identity | Used for tracking |
|------------------|-----------|-------------------|-------------------|
| Purchase history | ✅ Yes    | ✅ Yes            | ❌ No             |

- **What it is:** subscription tier (free / monthly / yearly) and expiry date,
  received from RevenueCat via webhook after Apple handles the actual payment.
  **We never see payment-card data.**
- **Purposes:** App Functionality (gating premium features).

#### 6. Usage Data — Product Interaction / Other Usage Data

| Data type         | Collected | Linked to identity | Used for tracking |
|-------------------|-----------|-------------------|-------------------|
| Product interaction | ✅ Yes  | ✅ Yes            | ❌ No             |
| Other usage data  | ✅ Yes    | ✅ Yes            | ❌ No             |

- **What it is:** writing streaks, entry counts, most-active writing day,
  peak writing hour, mood trend direction — computed weekly and stored in the
  `user_patterns` table. Shown only to the user in the Insights screen.
- **Purposes:** Analytics (first-party only, shown to the user; not sold or
  used for advertising).

#### Data NOT collected

- Precise or coarse location ❌
- Financial info (credit cards, bank accounts) ❌ — Apple handles all payments
- Browsing or search history ❌
- Sensitive info (racial/ethnic origin, sexual orientation, etc.) ❌
  — journal entries *may* contain this incidentally, but we do not parse,
  extract, or categorise it; it is stored as opaque user content
- Diagnostics / crash reports ❌ (no crash-reporting SDK)
- Device IDs / advertising IDs ❌

#### Tracking
**No tracking.** MindFlow does not use any data to track users across third-party
apps or websites, and does not share data with data brokers.

---

## Google Play — Data Safety Form

Fill in at: **Play Console → [your app] → Store presence → Data safety**.

### Section 1: Data collection and security

**Does your app collect or share any of the required user data types?** Yes.

**Is all of the user data collected by your app encrypted in transit?** Yes.
(All API calls use HTTPS/TLS; Railway enforces TLS for database connections.)

**Do you provide a way for users to request that their data is deleted?** Yes.
(In-app account deletion under Settings → Delete Account; data export also
available. Triggers cascade deletion in the DB with audit-log anonymisation.)

### Section 2: Data types

#### Personal info

| Data type     | Collected | Shared | Required | Ephemeral | Purpose(s)          |
|---------------|-----------|--------|----------|-----------|---------------------|
| Name          | ✅        | ❌     | ✅       | ❌        | App functionality   |
| Email address | ✅        | ✅ *   | ✅       | ❌        | App functionality   |

*Email is shared with **Resend** solely to send transactional emails
(password reset, inactivity notices). Not used for marketing.

#### Financial info

| Data type        | Collected | Shared | Required | Ephemeral | Purpose(s)          |
|------------------|-----------|--------|----------|-----------|---------------------|
| Purchase history | ✅        | ❌     | ✅       | ❌        | App functionality   |

Subscription tier + expiry received from RevenueCat webhook. Actual payment
data is processed entirely by Google Play; we never receive card details.

#### Health and fitness

| Data type   | Collected | Shared | Required | Ephemeral | Purpose(s)                    |
|-------------|-----------|--------|----------|-----------|-------------------------------|
| Health info | ✅        | ✅ *   | ❌       | ❌        | App functionality, Analytics  |

*Journal entry text (which may contain mental-health/wellbeing content) and
mood scores are shared with **Anthropic** for AI responses — **only** when the
user has explicitly opted in. Users who decline AI consent have their content
processed solely on our servers.

**"Required" = No** — AI is opt-in; the app works without it.

#### Messages

| Data type              | Collected | Shared | Required | Ephemeral | Purpose(s)        |
|------------------------|-----------|--------|----------|-----------|-------------------|
| Other in-app messages  | ✅        | ✅ *   | ❌       | ❌        | App functionality |

AI conversation messages (user turns + AI responses). Shared with Anthropic
only for opted-in users. These are turn-by-turn; we do not send historical
conversations across sessions (the system prompt says "treat every session as
fresh").

#### App activity

| Data type            | Collected | Shared | Required | Ephemeral | Purpose(s)           |
|----------------------|-----------|--------|----------|-----------|----------------------|
| App interactions     | ✅        | ❌     | ❌       | ❌        | Analytics            |
| Other app activity   | ✅        | ❌     | ❌       | ❌        | Analytics            |

Writing streaks, entry counts, mood trends, most-active day, peak writing hour
— computed weekly, shown only to the user in the Insights screen. Not shared.

#### Data NOT collected
- Location ❌
- Photos/videos ❌
- Audio ❌
- Files ❌
- Contacts ❌
- Calendar ❌
- Precise device or other IDs ❌
- Web browsing history ❌
- Crash logs / diagnostics ❌ (no crash-reporting SDK)

### Section 3: Third-party data sharing summary

| Recipient    | Data shared                          | Purpose                        | Opt-in? |
|--------------|--------------------------------------|--------------------------------|---------|
| Anthropic    | Journal entry text, AI chat messages | AI companion responses          | ✅ Yes  |
| Resend       | Email address only                   | Transactional email             | ❌ No (required for account) |
| RevenueCat   | User ID, subscription status         | Subscription management         | ❌ No (required for premium) |
| Apple/Google | Handled independently as payment processors | IAP | n/a |

---

## Google Play — Health Apps Declaration

Google requires an additional declaration for apps in categories that include
health or mental health. Navigate to:
**Play Console → [your app] → Store presence → App content → Health apps**.

### Suggested declaration answers

**Does your app contain health-related content?** Yes — mood tracking and
mental-wellbeing journaling.

**What type of health data does your app handle?**
Mental health / emotional wellbeing data: mood scores (1–5) and free-text
journal entries that may contain emotional or mental-health content.

**Is the data used for medical diagnosis or treatment?** No. MindFlow is a
journaling and reflection tool; it explicitly disclaims being a medical,
clinical, or therapeutic service. The in-app disclaimer and the Terms of
Service both state this.

**How is the data protected?**
- Stored on Railway (PostgreSQL, encrypted at rest on Google Cloud Platform US).
- All data in transit over HTTPS/TLS.
- Journal content is never logged server-side.
- AI processing opt-in only; Anthropic DPA (SCCs) covers cross-border transfer.
- Users can delete all data at any time from within the app.

**Is health data shared with third parties?** Only with Anthropic, and only when
the user has explicitly opted in to AI responses. Email address shared with
Resend for transactional email only; no health data included.

---

## Age Rating — Both Stores

Set to **16+** (App Store) / **Rating: Teen → 16+** (Google Play) to match
Privacy Policy §9, which states the minimum age is 16.

- **App Store Connect:** My Apps → [app] → App Information → Age Rating.
  Use the questionnaire; declare "Infrequent/Mild" for "Mature/Suggestive
  Themes" (users may write about difficult emotions), then manually set the
  final rating to 16+.
- **Google Play Console:** Store presence → Content rating → Questionnaire.
  Category: **Mental Health**. Declare mental health content; the system will
  suggest a rating — confirm 16+ (PEGI / IARC equivalent).

---

## Checklist

- [ ] Apple App Privacy form submitted in App Store Connect
- [ ] Google Play Data Safety form submitted in Play Console
- [ ] Google Play Health Apps declaration submitted
- [ ] Age rating set to 16+ on App Store
- [ ] Age rating set to 16+ on Google Play
- [ ] Privacy Policy URL entered in both consoles: `https://mindflowjournal.app/privacy.html`
- [ ] Terms of Use URL entered in App Store Connect: `https://mindflowjournal.app/terms.html`

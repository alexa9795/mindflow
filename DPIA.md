# Data Protection Impact Assessment (DPIA) — MindFlow

> **Status:** DRAFT for paid legal review. Prepared 2026-07-10 from the
> codebase + COMPLIANCE.md + PRIVACY_POLICY.md. GDPR Art. 35.
>
> **Why a DPIA is required:** MindFlow processes **special-category data**
> (mental-health / emotional content in journal entries, Art. 9) **and**
> performs **profiling** (automated pattern/mood-trend analysis). Under Art.
> 35(3)(a)–(b) and the EDPB/AEPD criteria, either factor alone points to a
> DPIA; both together make it mandatory.

## 1. Controller & DPO

- **Controller:** Open Brain Development SL (NIF B26910588), Plaza Music Fayos
  Num 4, Esc. C, Planta 3, Puerta 5, Valencia, Spain (EU).
- **DPO:** Not appointed. Assess Art. 37 obligation — arguably triggered by
  "large scale processing of special categories" (Art. 37(1)(c)); scale is
  currently small (pre-launch) but revisit as user numbers grow. **[REVIEW]**
- **Contact:** privacy@mindflowjournal.app

## 2. Description of the processing

| Aspect | Detail |
|---|---|
| **Nature** | Personal journaling app. Users write entries, record mood scores, optionally receive AI reflections, and view mood/activity insights. |
| **Scope** | Account data; journal text (special category); mood scores; AI conversation messages; subscription status; security audit logs. |
| **Context** | Consumer mobile app (iOS/Android), EU-established controller, users primarily EU (UK possible — see §7). Special-category data given voluntarily by the data subject about themselves. |
| **Purposes** | (a) provide journaling; (b) AI reflection (opt-in); (c) mood/activity insights via profiling; (d) crisis-signal detection; (e) account security. |
| **Data flows** | App → backend API (Railway/US) → PostgreSQL (Railway/US). AI content → Anthropic Claude API (US) only with AI consent. Emails → Resend (US). Payments → Apple/Google (never touch our servers). |

### Processing operations (as implemented in code)

1. **Storage of journal content** — `entries` table; gated by explicit
   storage consent captured at signup (`journaling_consent_given_at`,
   migration 024), enforced server-side.
2. **AI reflection** — `internal/ai/service.go`; entry text sent to Claude
   (`claude-sonnet-4-6`, max 600 tokens) only when `ai_consent_given_at` is
   set. Toggle-off in Settings → Privacy.
3. **Profiling / pattern detection** — `internal/patterns/`; weekly job over
   users with ≥5 entries/90d. Computes statistical aggregates only: most/least
   active day, avg mood by weekday, peak writing hour, entries per weekday,
   mood trend (improving/declining/stable). Stored in `user_patterns`. **No
   free-text/theme analysis is performed** (see §6 note).
4. **Crisis trigger detection** — `internal/ai/triggers.go` + `logger.go`;
   scans user messages sent to AI for a fixed phrase list; on match logs
   **metadata only** (`user_id` + matched keyword) via slog. **Journal content
   is never logged.** No automated decision results (no account action, no
   escalation) — crisis resources (findahelpline.com) are surfaced by the AI
   system prompt, not by this detector.
5. **Security audit logging** — `internal/audit/`; login, deletion, export,
   consent changes. Anonymised (user_id removed) on account deletion.

## 3. Necessity & proportionality

- **Lawful bases:** Contract (Art. 6(1)(b)) for account/subscription;
  **explicit consent (Art. 9(2)(a))** for storing and AI-processing
  special-category content, captured separately at two points; legitimate
  interest (Art. 6(1)(f)) for security audit logs.
- **Data minimisation:** Only email + name + hashed password for the account.
  No advertising identifiers, no analytics SDKs, no location. Biometric unlock
  is device-side only (never transmitted).
- **Purpose limitation:** Content used only to provide features to the user;
  never sold, never used for ads, never used to train AI models (per
  Anthropic Commercial Terms).
- **Retention:** Active while account active; automatic deletion at 12 months
  inactivity (warnings at 11 and 11.5 months); hard delete cascades to all
  content; audit logs anonymised, not deleted.
- **Data subject rights:** Access, export (JSON, Art. 20), erasure (Art. 17),
  objection/withdrawal of AI consent (Art. 21/7(3)), rectification — all
  in-app or via privacy@.

## 4. Risks to data subjects

| # | Risk | Likelihood | Severity | Inherent rating |
|---|---|---|---|---|
| R1 | Unauthorised access to journal content (breach) | Low | High | **High** |
| R2 | Special-category data transferred to US processors | Medium | Medium | **Medium** |
| R3 | AI provider misuse / retention of sensitive content | Low | High | **Medium-High** |
| R4 | Crisis signal missed or over-relied upon (safety) | Medium | High | **High** |
| R5 | Profiling produces misleading mood conclusions | Low | Low | **Low** |
| R6 | Consent not truly informed/granular | Low | Medium | **Medium** |

## 5. Measures to mitigate each risk

| # | Mitigations (implemented) | Residual |
|---|---|---|
| R1 | bcrypt passwords; TLS/HTTPS + HSTS; short-lived JWT (15m) + rotating refresh (7d), refresh/reset tokens SHA-256 hashed; DB access restricted to backend; encrypted at rest (Railway/GCP); journal content never logged; rate limiting on auth + AI. | **Low-Medium** |
| R2 | SCCs in every processor DPA (Anthropic/Railway/Resend), UK Addendums; TIA documented (see TIA.md); encryption in transit + at rest. | **Low-Medium** |
| R3 | Anthropic acts as processor under Commercial Terms + DPA; API inputs/outputs **not used for training**; AI is strictly opt-in with separate explicit consent; content sent only on demand. **[REVIEW]** confirm concrete Anthropic API retention window + zero-data-retention availability. | **Low-Medium** |
| R4 | Prominent in-app + policy disclaimers that the AI is not a therapist/crisis service; findahelpline.com surfaced; trigger detector logs metadata for safety awareness without making automated decisions. **Note:** detection is not a clinical safety net and is not represented as one. | **Medium** (accept; documented) |
| R5 | Insights framed as non-clinical trends; thresholds conservative (±0.5, min 5 mood entries → "insufficient_data"); no Art. 22 decision; user can disable. | **Low** |
| R6 | Two separate explicit consents (storage + AI), server-enforced, timestamped, audited, exportable; withdrawal any time in Settings. | **Low** |

## 6. Findings requiring action before sign-off

- **[FIX] Policy over-discloses profiling.** PRIVACY_POLICY.md §3.4 lists
  "Word/theme frequency analysis." **No such analysis exists in the code** —
  `patterns` and `insights` compute only mood/activity statistics on
  structured fields, never on entry text. Remove the row (or implement + keep)
  so the policy matches reality.
- **[REVIEW] Trigger-detection legal basis is inconsistent.** Policy §3.4
  states "explicit consent / vital interests"; `internal/ai/logger.go` comment
  states "legitimate interest (user safety)." Pick one basis and align both.
- **[REVIEW] §3.3 usage-quota wording.** Policy implies AI-message counts
  enforce quotas; in code only monthly *entry* count is enforced (free tier =
  10/month). Align wording or the free-tier design.
- **[REVIEW] Anthropic retention window** — state concretely in policy §6.1.
- **[REVIEW] DPAs signed in personal name** (Alexandra Tomulescu) — reassign
  to Open Brain Development SL to match the named controller.
- **[RESOLVED] UK Art. 27 representative** — not required: the app will be
  **geo-restricted out of the UK** (decision 2026-07-10). See §7.
- **[REVIEW] DPO appointment** — assess Art. 37 threshold as scale grows.

## 7. Consultation & residual risk

- **AEPD prior consultation (Art. 36):** Only required if high residual risk
  remains after mitigation. Current assessment: residual risks are Low–Medium
  after mitigations → **prior consultation not anticipated**. Re-assess if the
  crisis-detection role or AI processing expands. Confirm in paid review.
- **UK users:** **Decision (2026-07-10) — geo-restrict.** The app will not be
  offered in the UK (UK territory deselected in both store consoles at
  submission), so the UK GDPR Art. 27 representative obligation does not
  arise. Re-assess only if UK availability is later enabled.

## 8. Sign-off

| Role | Name | Date | Outcome |
|---|---|---|---|
| Controller | Open Brain Development SL | | |
| Reviewer (external counsel) | [TBD — paid review] | | |

*Review this DPIA on material change (new processor, new AI use, analytics
introduction) or at least annually.*

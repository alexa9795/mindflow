# Entity migration — moving accounts & DPAs to the SL

> Practical checklist for putting **Open Brain Development SL** (NIF
> B26910588, Valencia) behind the app, now that it's the named data
> controller/provider in the legal docs. Notes captured 2026-07-10.

## Core principle

A DPA (and a store account's legal identity) binds the **legal entity that is
the account's customer** — set by the account's registered **business/billing
details**, NOT by the login email. So in every case below you **keep your
existing account and login**; you only change the entity/billing details to
the SL (and, where a DPA was physically signed, re-sign it naming the SL).

## Processor DPAs

### Railway (hosting + DB) — DPA physically signed in personal name
- You do **not** need a new account. Keep your project + login.
- Steps: (1) set the Railway billing/organization **company legal name** to
  Open Brain Development SL + NIF B26910588; (2) contact Railway
  (support/legal) to **re-issue the DPA naming the SL as the customer** — the
  current DocuSign (Envelope A46F8A56-B730-4646-B1F9-11AC7962BDB2) is in
  Alexandra Tomulescu's personal name and must be re-signed to match.

### Anthropic (AI inference) — DPA incorporated via Commercial Terms
- No need to recreate the account. Update the **Organization / billing
  details** to the SL (name + NIF as billing entity); the DPA re-incorporates
  under that entity on the Commercial Terms.
- Only create a fresh account if you want clean billing separation. If you do,
  reissue the API key and update `ANTHROPIC_API_KEY` on Railway.

### Resend (transactional email) — DPA binding on ToS acceptance
- Same as Anthropic: update the account's **org/billing details** to the SL
  rather than recreating. Pre-signed DPA then binds the SL. No sender-domain
  re-verification needed if the account stays.

## Store developer accounts (enroll as Organization = the SL)

To show "Open Brain Development SL" as the public developer (and for the
acquisition goal), both stores need **Organization** accounts under the SL.
Both require a **D-U-N-S number** for the SL first (see below).

### Google Play — existing account is INDIVIDUAL
- Google does **not** allow converting Individual → Organization.
- **Decision (2026-07-10): do NOT buy a second $25 account up front.** Launch
  on the existing individual account, and use Google Play's **app transfer**
  to move the app to an SL Organization account later, if/when acquisition
  becomes concrete. (App transfer is a supported flow; the SL org account's
  $25 is only paid when actually needed.)
- Trade-off accepted: until transfer, the public Play developer name won't be
  the SL. The app is still *operated by* the SL (data controller per the
  policy); align the store identity at transfer time.

### Apple — history of enrolment failures
- Try **Organization** enrolment under the SL ($99/yr) once the SL D-U-N-S
  exists.
- If it fails again, **contact Apple Developer Support directly** (phone/email)
  — enrolment blocks are usually human-resolvable.
- **Do not block the whole launch on Apple** — ship Android first if needed.

## D-U-N-S number for the SL

Both stores require a D-U-N-S for organization accounts. Free to obtain.
- **Easiest (free) path — Apple's D-U-N-S lookup/request tool:**
  https://developer.apple.com/enroll/duns-lookup/ — check whether Open Brain
  Development SL already has one; if not, request it there (free, ~5 business
  days, sometimes up to 2 weeks).
- Or directly from **Dun & Bradstreet**: https://www.dnb.com (in Spain,
  Informa D&B). The SL may already have a D-U-N-S from company registration —
  check first before requesting a new one.
- Request this **first** — it's the long pole for both org accounts.

# Transfer Impact Assessment (TIA) — MindFlow

> **Status:** DRAFT for paid legal review. Prepared 2026-07-10. Assesses
> transfers of EU/EEA personal data — including **special-category data** —
> to processors in the United States, following *Schrems II* (C-311/18) and
> the EDPB Recommendations 01/2020.

## 1. Parties & transfers assessed

| Processor | Data transferred | Location | Role |
|---|---|---|---|
| **Anthropic PBC** | Journal entry text + AI messages (special category), only with AI consent | USA | Processor (AI inference) |
| **Railway Corporation** | All stored personal data incl. journal content (special category), audit logs | USA (Google Cloud) | Processor (hosting/DB) |
| **Resend** | Email address + transactional email content | USA | Processor (email) |
| Apple / Google | Subscription status only (no card data to us) | Global | Independent controllers (payments) |

Controller: **Open Brain Development SL** (NIF B26910588), Valencia, Spain.

## 2. Step 1 — Map the transfer

- Direct controller-to-processor transfers, EU → US, over TLS.
- Special-category data reaches **Anthropic** (entry text for AI) and
  **Railway** (all stored data). Resend receives only email addresses +
  system-email content (no journal content). Apple/Google receive no content.

## 3. Step 2 — Transfer tool (Art. 46)

- **Anthropic:** Standard Contractual Clauses incorporated into Anthropic's
  Commercial Terms / DPA (https://www.anthropic.com/legal/dpa). Accepted
  2026-05-07.
- **Railway:** EU SCCs **Module 2 (Controller→Processor)** + UK Addendum,
  DocuSign-signed 2026-05-07 (Envelope A46F8A56-B730-4646-B1F9-11AC7962BDB2).
- **Resend:** EU SCCs + UK Addendum, pre-signed DPA, binding on ToS
  acceptance; downloaded 2026-05-07.
- **[REVIEW]** Confirm whether each processor is certified under the **EU–US
  Data Privacy Framework (DPF)**. If certified, the DPF is an adequacy
  mechanism (Art. 45) that can supplement/replace SCC reliance and materially
  lowers residual risk. Reference the certification if present.

## 4. Step 3 — Effectiveness of the tool in the US context

- Key concern post-*Schrems II*: US surveillance law (FISA 702, EO 12333) and
  whether SCCs alone give essentially equivalent protection.
- **Mitigating context (2023+):** the **EU–US Data Privacy Framework** and US
  Executive Order 14086 (redress mechanism, proportionality limits on signals
  intelligence) were found adequate by the Commission (adequacy decision
  10 July 2023). Transfers to DPF-certified importers benefit from this.
- **Nature of the data raises the bar:** special-category mental-health
  content → apply supplementary measures regardless.

## 5. Step 4 — Supplementary measures

| Measure | Status |
|---|---|
| Encryption in transit (TLS 1.2+) to all processors | ✅ Implemented |
| Encryption at rest (Railway/GCP DB) | ✅ Implemented |
| Data minimisation — only send content to Anthropic on explicit opt-in, on demand | ✅ Implemented |
| No training use of API content (Anthropic Commercial Terms) | ✅ Contractual |
| Pseudonymisation — content keyed to internal user IDs, not names, at the API boundary | ⚠️ **[REVIEW]** confirm no directly-identifying data is sent alongside entry text to Anthropic |
| Contractual: transparency re: government-access requests; challenge unlawful requests | ✅ In SCCs/DPA |
| Zero-data-retention API option (Anthropic) | ⚠️ **[REVIEW]** confirm availability on current plan |

## 6. Step 5 — Procedural steps

- SCCs executed with all three processors (see §3).
- This TIA documented and retained; re-assess on material change or if the
  DPF adequacy decision is invalidated.

## 7. Conclusion (subject to legal review)

With SCCs + UK Addendums in place, encryption in transit and at rest, strictly
opt-in and on-demand transfer of special-category content to Anthropic, a
no-training contractual commitment, and (to be confirmed) DPF certification of
the importers plus the 2023 EU–US adequacy framework, the transfers are
assessed as providing **essentially equivalent protection** with **acceptable
residual risk**. Two items must be closed before final sign-off:

1. **[REVIEW]** Confirm DPF certification status of Anthropic, Railway, Resend.
2. **[REVIEW]** Confirm Anthropic API retention window + zero-data-retention
   availability, and that no directly-identifying data accompanies entry text.

Also: reassign the three DPAs from Alexandra Tomulescu (personal) to Open
Brain Development SL to match the named controller.

## 8. Sign-off

| Role | Name | Date |
|---|---|---|
| Controller | Open Brain Development SL | |
| Reviewer (external counsel) | [TBD — paid review] | |

---
name: crm-signals
description: >
  Surface structured CRM signals extracted from the communication history of
  any monday CRM item — deals, accounts, contacts, or plain items. Use this
  skill whenever the user asks what's actually happening with a deal, account,
  or contact based on emails, meetings, or logged activities. Triggers on:
  "what's the status of this account", "why is this deal stuck", "what
  commitments were made", "any blockers on this", "is this account still
  engaged", "summarize my communication with [contact or company]", "what came
  up in the emails", "deal health", "account health", "signals for this item",
  "show me the context on this", "any red flags", "what's the relationship
  looking like", "what did we promise them", "buying signals", "is this account
  at risk". If the user is asking about a CRM item and wants intelligence beyond
  board column data — anything that requires reading the actual communication
  history — this skill is almost certainly the right one.

  ⚠️ Feature-gated: only works for accounts with the
  `enable-crm-context-gateway-plat-mcp` flag enabled. If signals come back
  empty or the tool errors, check flag eligibility before troubleshooting.
compatibility:
  tools:
    - extract_signals
    - get_board_items_page
    - query_items
---

# CRM Signals

Extract structured intelligence from a CRM item's communication history —
emails, meetings, and logged activities — and surface it as actionable context.

This skill reads what actually happened across your deal, account, or contact
relationship, not just what was manually logged. The result is a set of typed
signals: blockers, buying signals, commitments, objections, open questions, and
a relationship health summary — grounded in the real communication record.

Works on any monday CRM item type: deals, accounts, contacts, or plain items.

---

## Before you start: flag check

`extract_signals` is gated on `enable-crm-context-gateway-plat-mcp`. If the
user's account doesn't have this flag, the tool will return an error or empty
signals. If that happens, say so clearly — don't retry or suggest workarounds.

---

## Step 1: Resolve the item ID

You need a monday item ID. Get it from:
- The user's message (they often paste a URL or mention an item name)
- `query_items` — search by name on the CRM board the user is working on
- `get_board_items_page` — if they want signals across multiple items (e.g., all accounts in a territory)

If the item could be a deal, account, or contact, use whatever board context
the user is in. The signal logic is the same regardless of item type — the
communication history is what matters.

If the user mentions multiple items, ask which to start with unless they
explicitly want batch mode (see below).

---

## Step 2: Call extract_signals

**Single item (on-demand — always fresh):**
```
extract_signals({
  itemId: <number>,
  resourceTypes: ["email_thread", "video_meeting", "activity"],
  timeWindowDays: 30
})
```

Start with all three resource types. The tool handles unsupported types
gracefully — it returns empty signals with an explanatory message, so there's
no penalty for requesting types that aren't available yet.

**Batch mode (up to 50 items — stored signals only, faster):**
```
extract_signals({
  itemIds: [<id1>, <id2>, ...],
  resourceTypes: ["email_thread", "video_meeting", "activity"]
})
```

Items with no stored signals appear in `itemsRequiringIndividualExtraction`.

**How to handle this depends on what the user asked for:**

- **Pipeline scan / health check ("scan my pipeline", "which deals have signals"):**
  If *most or all* items are in `itemsRequiringIndividualExtraction`, it means
  signals haven't been indexed yet — the answer is "no signals cached yet, likely
  E&A not connected." Do NOT run individual extraction on each item. That would
  take minutes and return the same empty result for every one. Instead, tell the
  user what you found and explain why (E&A not connected, or account is newly set
  up). Offer to do a deep-dive on a specific item if they want fresh extraction.

- **Specific item deep-dive ("what's happening with Acme", "signals for this deal"):**
  Run individual extraction for that item. This is the right use of on-demand
  extraction — the user wants fresh signals for one item they care about.

- **Mixed result (some cached, some not):** Surface the cached signals, then note
  which items had no cached signals and offer to run those individually.

---

## Step 3: Read and present the signals

Each signal has: `signalType`, `signalSubType`, `structuredData`, `communicationEventsIds`.

Present signals grouped by type, most actionable first. Skip empty types
silently — don't say "no blockers found" for every type that's empty. Only
surface types that have data.

### Signal types and how to present them

**`summary`** — Lead with this. It has `dealHealth.status` (`strong` /
`promising` / `at_risk` / `stalled` / `dead`), `reasoning`, `sentiment`, and
`topPriority`. Show the status prominently and the top priority as the first
action. Even for non-deal items (accounts, contacts), this gives a relationship
health read.

**`commitment`** — Show as a checklist: who committed to what, by when, and
whether it's marked complete. Overdue open commitments deserve a callout.

**`blocker`** — Show with the blocker type (legal / budget / technical /
stakeholder / competitor) and the specific issue. These need immediate action.

**`buying_signal`** — Positive momentum indicators: contract requests, pricing
discussions, technical validation, expansion interest. Useful for forecasting
and prioritizing which accounts to focus on.

**`objection`** — Explicit pushback on pricing, timing, features, or ROI. Show
alongside the `buying_signal` count for a balanced picture.

**`strategic_outlook`** — Recommended next move + unresolved tensions. Usually
the most useful closing section.

**`question`** — Open questions that may be blocking progress. Flag any that
are several days old without a response.

**`stakeholder`** — Individual role, sentiment, and influence within the account.
Useful when preparing for a call or mapping the buying committee.

**`decision`** — Concrete direction changes or agreed terms. Useful for
understanding what's already locked in — especially on long-running accounts.

**`task_resolution`** — Explicit task closures with source quotes. Useful for
audit trails.

---

## Step 4: Output format

Keep it dense and scannable. Lead with the item name and health status, then
signals. No preamble — just the results. Adapt the framing to the item type:
"deal health" for deals, "account health" or "relationship status" for accounts
and contacts.

**Example (account):**
```
## Acme Corp — At Risk 🔴

**Top priority:** Resolve data residency question before procurement review
(commitment overdue since Aug 3)

### Commitments
- [ ] You → send revised SLA doc by Aug 3 (overdue)
- [x] Acme legal → review DPA (done, Aug 1)

### Blockers
- **Legal:** GDPR data residency clause unresolved — procurement blocked

### Buying Signals
- Champion (Mads) confirmed the product fits their use case (Aug 4)
- Requested contract template

### Objections
- Pricing: current quote cited as 40% over budget; alternative model requested

### Recommended move
Prioritize the legal blocker — procurement won't unblock without it. Offer
a data-residency FAQ or a reference customer in the same region.
```

---

## Edge cases

**No signals returned:** If `signals` is empty with no `message`, the item
likely has no recent communications in the lookback window. Suggest extending
`timeWindowDays` (try 60 or 90).

**`message` present with empty signals:** The tool is explaining why — usually
"no communications found" or "resource type not supported yet". Surface this
message to the user.

**`itemsRequiringIndividualExtraction` non-empty in batch mode:** Tell the user
which items need individual extraction and offer to run those individually.

**Flag not enabled:** If the tool errors with a permission/auth message, say:
"This feature requires the `enable-crm-context-gateway-plat-mcp` flag to be
enabled on your account. Check with your monday admin or account team."

---

## Cross-skill handoffs

- User wants to **log a new activity** after reviewing signals → `log-activity`
- User wants to **enroll a contact in a follow-up sequence** → `run-sequence`
- User wants **team-wide activity patterns** (not item-specific) → `activity-insights`
- User wants to **turn a meeting recap into a deal update** → `meeting-to-deal`

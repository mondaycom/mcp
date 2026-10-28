---
name: crm-signals
description: >
  Surface structured signals from the communication history of one monday CRM item — a deal, account, contact, or lead. Reads emails, meetings, calls, and logged activities and returns typed signals: health summary, commitments, blockers, buying signals, objections, decisions, stakeholders, open questions, and a recommended next move. Use when someone asks "what's happening with this deal", "why is this deal stuck", "what commitments were made", "any blockers on this", "is this account still engaged", "summarize my communication with [contact or company]", "what came up in the emails", "deal health", "account health", "signals for this item", "any red flags", "what did we promise them", "buying signals", or "is this account at risk". Also handles "what needs my attention across my accounts" and "top signals" by showing the account-wide AI Suggestions widget.
argument-hint: "[deal, account, or contact name or link — 'what's happening with Acme', 'blockers on the Globex deal', 'top signals today']"
user-invocable: true
allowed-tools: [Read, AskUserQuestion, mcp__monday__get_user_context, mcp__monday__search, mcp__monday__get_board_info, mcp__monday__get_board_items_page, mcp__monday__extract_signals, mcp__monday__get_account_task_rollup]
---

# CRM Signals

Extract structured intelligence from a CRM item's communication history — emails, meetings, calls, and logged activities — and surface it as actionable context.

This skill reads what actually happened in the relationship, not just what was typed into columns. Works on any monday CRM item type: deals, accounts, contacts, leads, or plain items.

---

## Step 0: Connector check

1. Call `mcp__monday__get_user_context`. On error → tell the user to install and connect the monday MCP connector, stop.

---

## Step 1: Pick the mode

- **No specific item named** ("top signals", "what needs my attention", "anything urgent across my accounts") → call `get_account_task_rollup` with no arguments. It renders the AI Suggestions widget with the top open account tasks. The widget is the answer — do not repeat its contents in chat. Offer a deep-dive on any item it shows, then stop.
- **One item named** → single-item mode (Step 2).
- **A list of items** ("scan my pipeline", "which of my open deals have signals") → batch mode (Step 2).

---

## Step 2: Resolve the item ID

You need a numeric monday item ID. Get it from:
- A pasted item link (the number after `/pulses/`).
- `search` with `searchType: "ITEMS"` and a short name (start with `strategy: "SPEED"`).
- `get_board_items_page` with `searchTerm`, or with filters when the user wants a set of items (for example all open deals in a group). Use `get_board_info` first if you need column ids for the filter.

If several items match, list them (name, board, owner) and ask which one. If the user mentions several items, ask which to start with unless they asked for a scan.

---

## Step 3: Call extract_signals

**Single item (stored signals, or fresh extraction if none are stored):**
```
extract_signals({
  itemId: <number>,
  resourceTypes: ["email_thread", "video_meeting", "phone_call", "activity"],
  timeWindowDays: 30
})
```

Always pass `resourceTypes` — the default is `email_thread` only. Unsupported types return empty signals with an explanatory message, so asking for all four costs nothing.

**Batch (up to 50 items, stored signals only — faster):**
```
extract_signals({
  itemIds: [<id1>, <id2>, ...],
  resourceTypes: ["email_thread", "video_meeting", "phone_call", "activity"]
})
```

Items with no stored signals come back in `itemsRequiringIndividualExtraction`. How to handle that depends on the request:

- **Pipeline scan:** if most or all items need individual extraction, signals have not been indexed for this account yet — usually because Emails & Activities is not connected, or the account is new. Do NOT extract each item one by one: it takes minutes and returns the same empty result. Say what you found and why, and offer a deep-dive on one item.
- **Mixed result:** show the stored signals, then list the items without them and offer to extract those individually.

To narrow a long answer, pass `signalTypes` (for example `["blocker", "objection"]` for "any red flags").

---

## Step 4: Read and present the signals

Each signal has `signalType`, `signalSubType`, `structuredData`, and `communicationEventsIds`.

Group by type, most actionable first. Only show types that have data — do not list empty types.

| Signal type | How to present |
|---|---|
| `summary` | Lead with it. Show `dealHealth.status` (`strong` / `promising` / `at_risk` / `stalled` / `dead`), the reasoning, sentiment, and `topPriority` as the first action. For accounts and contacts, frame it as relationship health. |
| `commitment` | Checklist: who committed to what, by when, done or open. Call out overdue open commitments. |
| `blocker` | Blocker type (legal / budget / security / technical / stakeholder / competitor) and the specific issue. These need action now. |
| `buying_signal` | Forward momentum: contract requests, pricing talks, technical validation, expansion interest. |
| `objection` | Explicit pushback on pricing, timing, features, competitors, or ROI. Show next to buying signals for balance. |
| `strategic_outlook` | Recommended next move and unresolved tensions. Usually the closing section. |
| `question` | Open questions that may block progress. Flag ones left unanswered for several days. |
| `stakeholder` | Role, sentiment, and influence of each person. Useful before a call or for mapping the buying committee. |
| `decision` | Agreed terms or direction changes — what is already locked in. |
| `task_resolution` | Explicit task closures with the source quote. Only show when the user asks for an audit trail. |

---

## Step 5: Output format

Dense and scannable. Lead with the item name and health status, then the signals. No preamble. Say "deal health" for deals and "account health" or "relationship status" for accounts and contacts.

```
## Acme Corp — At risk

**Top priority:** Resolve the data residency question before procurement review (commitment overdue since Aug 3)

### Commitments
- [ ] You → send revised SLA doc by Aug 3 (overdue)
- [x] Acme legal → review DPA (done, Aug 1)

### Blockers
- **Legal:** GDPR data residency clause unresolved — procurement blocked

### Buying signals
- Champion (Mads) confirmed the product fits their use case (Aug 4)
- Requested a contract template

### Objections
- Pricing: quote cited as 40% over budget; alternative model requested

### Recommended move
Clear the legal blocker first — procurement won't move without it. Offer a data-residency FAQ or a reference customer in the same region.
```

---

## Edge cases

- **Empty signals, no `message`:** probably no communication in the window. Offer to retry with `timeWindowDays` 60 or 90.
- **`message` present with empty signals:** the tool is explaining why (no communications found, type not supported yet). Pass the message on.
- **Tool error or "not available":** signals may not be enabled for this account yet. Say so plainly, and offer what still works: the item's timeline via `log-activity`, or meeting notes via `meeting-to-deal`. Do not retry in a loop.
- **No email connected:** most signals come from email. If the scan is empty, suggest connecting a mailbox in monday CRM's Emails & Activities.

---

## Cross-skill handoffs

- Log a new activity after reviewing signals → `log-activity`
- Enroll the contact in a follow-up sequence → `run-sequence`
- Team-wide activity volume or rep comparisons → `activity-insights`
- Turn a meeting into a deal update → `meeting-to-deal`
- Post-mortem on a closed deal → `win-loss-review`
- Ranked view of the whole pipeline to start the day → `daily-briefing`

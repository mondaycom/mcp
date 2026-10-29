# Example 4 — Proactive mode with new contacts and commitment nudges

Shows: Proactive approval captured once, recaps and a stage edit written without a further prompt, two contacts created (one deal link fails and is retried without it), nudges pinned to the recap updates, sync doc written last.

---

**User:**
> sync notetaker — proactive

**Step 0**
*[`get_user_context` → `{ id: 203911, name: "Priya Nair" }` (no email); the Deals board's `get_board_info` shows `creator: { id: 203911, email: "priya@northwind.io" }` → `internal_domain = northwind.io`]*
*[`explore_meetings({ limit: 1 })` → OK]*

**Step 1 — Proactive approval (asked once)**
> Proactive mode will (a) write recaps to matched deals, (b) create missing contacts, (c) apply high-confidence stage and last-touch edits, (d) notify deal owners about commitments due this week. Amount columns stay untouched. Approve all / approve all except stage edits / switch to Default?

**User:** approve all

**Step 2–3** — last 24h; *[`explore_meetings(…)` → 3 meetings; `get_meetings_content({ ids: [8811, 8812, 8813], include_summary: true, include_action_items: true })`]*

1. "Luminary Health — demo" (carlos@luminaryhealth.com, anita@luminaryhealth.com, priya@northwind.io)
2. "Redwood Fintech — legal sign-off" (lena@redwoodfintech.com, priya@northwind.io)
3. "Internal retro — Q2 planning" (priya@, daniel@, ori@northwind.io)

**Step 4** — Deals `10046221612` (stage label ids: Discovery 0, Legal 1, Procurement 2, Won 3, Lost 4; last-touch `date_touch`). Contacts `10082334477` (email `email`, company `text_co`, relation `deal_link` → Deals, source `status_src` with label "Claude").

**Step 5 — match**
- Meeting 1 → `luminaryhealth` ↔ "Luminary Health" → 5 → **matched** (deal 220100)
- Meeting 2 → lena@redwoodfintech.com equals the deal's email column (+5) and domain matches (+5) → 10 → **matched** (deal 220101)
- Meeting 3 → no external attendees → **skipped: internal-only**

**Step 6 — synthesize**
- Redwood Fintech: "we've cleared legal, I'm moving this to procurement today" → Legal → Procurement, **high** (explicit, maps to the existing "Procurement" label).
- Commitments due within 7 days: Priya → send onboarding guide to Luminary (due Jun 12); Lena → send PO to Redwood (due Jun 14).

**Step 7a — idempotency**
*[`get_updates({ objectType: "Item", objectIds: ["220100", "220101"], limit: 100 })` → no `ref meeting-to-deal/8811|8812`]*
*[contacts lookup: `get_board_items_page({ boardId: 10082334477, searchTerm: "carlos@luminaryhealth.com" })` → none; same for anita@ → none; lena@ is already a contact → 2 missing]*

**Step 7c — write (no prompt: Proactive approved)**
*[`change_item_column_values({ boardId: 10046221612, itemId: 220100, columnValues: "{\"date_touch\": {\"date\": \"2026-06-11\"}}" })`]*
*[`create_update({ itemId: 220100, body: "<h3>Meeting recap — Luminary Health — demo</h3>…ref meeting-to-deal/8811…" })` → update 31001]*
*[`change_item_column_values({ boardId: 10046221612, itemId: 220101, columnValues: "{\"status\": {\"label\": \"Procurement\"}, \"date_touch\": {\"date\": \"2026-06-11\"}}" })`]*
*[`create_update({ itemId: 220101, body: "…ref meeting-to-deal/8812…<p>Applied: Legal → Procurement</p>…" })` → update 31002]*

**Step 8 — contacts**
*[`create_item({ boardId: 10082334477, name: "Carlos Reyes", columnValues: "{\"email\": {\"email\": \"carlos@luminaryhealth.com\", \"text\": \"carlos@luminaryhealth.com\"}, \"text_co\": \"Luminary Health\", \"deal_link\": {\"item_ids\": [220100]}, \"status_src\": {\"label\": \"Claude\"}}" })` → error on `deal_link`]*
*[retry once without `deal_link` → item 330501 — listed as "pending manual link"]*
*[`create_item({ boardId: 10082334477, name: "Anita Shah", columnValues: "{…, \"deal_link\": {\"item_ids\": [220100]}, …}" })` → item 330502]*

**Step 9 — nudges** (deal owner of both deals: Priya, 203911)
*[`create_notification({ user_id: "203911", target_id: "31001", target_type: "Post", text: "Commitment due 2026-06-12 on Luminary Health: send onboarding guide to Carlos and Anita" })`]*
*[`create_notification({ user_id: "203911", target_id: "31002", target_type: "Post", text: "Commitment due 2026-06-14 on Redwood Fintech: Lena to send the PO — follow up if it hasn't arrived" })`]*

**Step 10 — sync doc** *[`create_doc({ location: "workspace", workspace_id: 4401, doc_kind: "private", doc_name: "Meeting sync — Jun 11, 2026", markdown: … })`]*

```markdown
# Meeting sync — Jun 11, 2026

## Matched (2)
- Luminary Health — demo → Luminary Health (https://…)
- Redwood Fintech — legal sign-off → Redwood Fintech (https://…) · stage → Procurement

## Skipped (1)
- Internal retro — Q2 planning — internal-only

## Contacts created (1)
- Anita Shah (anita@luminaryhealth.com) → linked to Luminary Health

## Contacts pending manual link (1)
- Carlos Reyes (carlos@luminaryhealth.com) — contact created, deal link failed — set it on the Contacts board

## Commitments due this week (2)
- Luminary Health — Priya → send onboarding guide (due Jun 12)
- Redwood Fintech — Lena → send PO (due Jun 14)

---
Generated by Claude · meeting-to-deal · 2026-06-11T09:14:00Z
```

Synced 3 meetings to 2 deals (1 skipped as internal). 0 unmatched, 0 ambiguous, 2 contacts created (1 link pending). Doc: https://your-account.monday.com/docs/…

---

## What this example demonstrates

- Proactive approval is asked once in Step 1; no further prompts.
- Item ids are numeric; every write uses the live tool arguments (`create_item.name` + `columnValues`, `create_notification.user_id / target_id / target_type`).
- Contacts are linked to the deal in the same `create_item` call; a failed link is retried once without it and listed once, under "pending manual link".
- Nudges point at the recap update on each deal (`target_type: "Post"`), so each commitment opens on its own deal. They run before the sync doc.

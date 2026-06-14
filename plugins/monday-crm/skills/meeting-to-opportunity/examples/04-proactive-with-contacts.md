# Example 4 — Proactive mode with β auto-contacts + notifications

Shows: Proactive mode approved upfront, 2 new contacts auto-created (with one connect-board link failure), notifications batched to sync doc item, 1 commitment nudge fired.

---

**User:**
> sync notetaker — proactive

**Claude (step 0 — connector + NoteTaker check):**
*[calls `mcp__monday__get_user_context` → `user: { id: 203911, name: "Priya Nair", email: "priya@monday.com" }`]*
*[internal_domain = "monday.com"]*
*[calls `mcp__monday__get_notetaker_meetings({ limit: 1 })` → OK]*

**Claude (step 1 — mode):**

> Proactive mode will:
> (a) write recaps to matched deals
> (b) auto-create missing contacts on your Contacts board
> (c) apply stage/last-touch edits when transcripts are unambiguous
> (d) notify deal owners for commitments due this week
>
> Amount columns stay untouched.
>
> Approve all / review each batch / deny stage edits only?

**User:** approve all

**Claude (step 2 — time window):**
No argument → last 24h. *(Default-window echo suppressed — not first run and meetings were found.)*

**Claude (step 3 — pull meetings):**
*[calls `get_notetaker_meetings(...)` → 3 meetings]*

1. "Luminary Health — demo" (attendees: carlos@luminaryhealth.com, anita@luminaryhealth.com, priya@monday.com · 45m)
2. "Redwood Fintech — procurement review" (attendees: lena@redwoodfintech.com, priya@monday.com · 30m)
3. "Internal retro — Q2 planning" (attendees: priya@monday.com, daniel@monday.com, ori@monday.com · 60m)

**Claude (step 4 — resolve boards):**
*[Deals board: `10046221612`. Contacts board: `10082334477`. Columns resolved on both.]*

**Claude (step 5 — match):**
- Meeting 1 → `luminaryhealth.com` domain → deal "Luminary Health" · score 8 → **matched**
- Meeting 2 → `lena@redwoodfintech.com` email → deal "Redwood Fintech" email column exact match · score 5 → **matched** + stage transition: Discovery → Procurement signal (high confidence)
- Meeting 3 → all `@monday.com` (internal_domain) + no deal-name match → **skipped** (internal-only)

**Claude (step 5 — β: check Contacts board):**
*[`get_board_items_page(boardId: 10082334477)` → existing contacts: lena@redwoodfintech.com found (linked to Redwood Fintech deal). carlos@luminaryhealth.com: NOT found. anita@luminaryhealth.com: NOT found.]*

2 new contacts to create: carlos@luminaryhealth.com, anita@luminaryhealth.com.

**Claude (step 6 — synthesize recaps):**

Meeting 1 (Luminary Health):
- Key points: Live demo of CRM board + automations; team excited about Notetaker integration
- Commitments: Priya to share onboarding guide by tomorrow; Carlos to loop in IT by end of week
- Open questions: HIPAA compliance checklist — Carlos flagged need to confirm

Meeting 2 (Redwood Fintech):
- Key points: Procurement review call; Lena confirmed all legal items cleared
- Commitments: Lena to send PO by Friday
- Stage transition: Discovery → Procurement (Lena: "we've cleared legal, moving this to procurement now") — confidence: high

**Claude (step 7 — Proactive: no batched confirm prompt; writes immediately):**

*[Idempotency check — Meeting 1 (Luminary Health):]*
*[`all_monday_api` → `{ items_by_id(ids: [220100]) { updates(limit: 50) { body } } }` → no existing update with `<!-- meeting-id: nm_8811 -->` found → proceed with new update]*

*[`create_update(itemId: "luminary_001", body: "<recap>")` — OK]*
*[`change_item_column_values(itemId: "luminary_001", { last_touch: "2026-06-11" })` — OK]*

*[Idempotency check — Meeting 2 (Redwood Fintech):]*
*[`all_monday_api` → no existing update with `<!-- meeting-id: nm_8812 -->` → proceed]*

*[`create_update(itemId: "redwood_001", body: "<recap>")` — OK]*
*[`change_item_column_values(itemId: "redwood_001", { last_touch: "2026-06-11", stage: "Procurement" })` — OK]*

**Claude (step 8 — β: auto-create contacts):**

*[`create_item(boardId: 10082334477, itemName: "Carlos Reyes", groupId: "new")` → itemId: contact_c001 — OK]*
*[`change_item_column_values(itemId: contact_c001, { email: "carlos@luminaryhealth.com", company: "Luminary Health", source: "Claude" })` — OK]*
*[`all_monday_api` connect-board link carlos → luminary_001 → error: `{ "error_code": "ColumnValueException", "message": "connect_boards column write failed" }` → skip link, will log as pending]*

*[`create_item(boardId: 10082334477, itemName: "Anita Shah", groupId: "new")` → itemId: contact_a001 — OK]*
*[`change_item_column_values(itemId: contact_a001, { email: "anita@luminaryhealth.com", company: "Luminary Health", source: "Claude" })` — OK]*
*[`all_monday_api` connect-board link anita → luminary_001 → OK]*

**Claude (step 10 — sync doc):**

*[`create_doc(workspaceId, title: "Meeting sync — Wed, Jun 11", body: <sync summary>)` → itemId: doc_s001 — OK]*

```markdown
# Meeting sync — Wed, Jun 11

## Matched (2/3)
- "Luminary Health — demo" → Luminary Health (deal url)
- "Redwood Fintech — procurement review" → Redwood Fintech (deal url) (stage → Procurement)

## Skipped (1)
- "Internal retro — Q2 planning" — internal-only, no CRM relevance

## Contacts created (2)
- Carlos Reyes (carlos@luminaryhealth.com) — contact created, deal link pending — set manually
- Anita Shah (anita@luminaryhealth.com) → linked to Luminary Health

## Contacts pending manual link (1)
- Carlos Reyes (carlos@luminaryhealth.com) — contact created, deal link pending — set manually

Generated by Claude · 2026-06-11T09:14:00Z
```

**Claude (step 9 — notifications):**

Commitments due within 7 days:
- Priya to send onboarding guide to Luminary Health (due 2026-06-12 — "by tomorrow")
- Lena (external) sending PO (due 2026-06-14 — "by Friday") — note: notification goes to deal owner Priya, not to Lena

*[`create_notification({ userId: 203911, itemId: doc_s001, text: "Commitment due 2026-06-12 on Luminary Health: send onboarding guide to Carlos and Anita" })` — OK. Pinned to sync doc item (doc_s001) — not to an arbitrary deal item.]*
*[`create_notification({ userId: 203911, itemId: doc_s001, text: "Commitment due 2026-06-14 on Redwood Fintech: Lena to send PO — follow up if not received" })` — OK.]*

---

Synced 2 meetings to 2 deals. 1 skipped (internal). 2 contacts created (1 link pending). 2 commitment nudges sent. Doc: https://your-account.monday.com/docs/meeting-sync-wed-jun-11

---

## What this example demonstrates

- Proactive mode approval is captured once at Step 1 and cached for the full run — no per-step re-prompting.
- `internal_domain` ("monday.com") used in Step 5 to identify and skip the all-internal retro meeting.
- β auto-contact: Contacts board found → contacts created inline (no chat prompt to find the board).
- connect-board link failure handled gracefully: contact still created, failure logged in sync doc as "pending — set manually" rather than halting the run.
- Notifications pinned to the sync doc item ID (`doc_s001`), not to individual deal items — correct behavior for cross-deal commitment batches.
- `all_monday_api` items_by_id idempotency check shown explicitly (Meeting 1 example, pre-write).
- Default-window echo suppressed because meetings were found (not first run / not zero-result case).

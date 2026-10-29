# Example 2 — Notetaker not connected: manual input path

Shows: the Notetaker probe fails, the skill does not stop, the user pastes notes, and the pasted meeting goes through the normal match → confirm → recap flow.

---

**User:**
> sync notetaker

**Step 0**
*[`get_user_context` → `{ id: 912044, name: "Sarah Levi", email: "sarah@gmail.com" }` → public mail provider → `internal_domain = none` (only sarah@gmail.com counts as internal)]*
*[`explore_meetings({ limit: 1 })` → error "NoteTaker not enabled for this account" → `notetaker_available: false`; continue]*

**Step 3b — manual input**
> No Notetaker recordings available. How do you want to provide the meeting?
> (a) Paste notes here · (b) Give a file path · (c) Describe it · (d) Skip

**User:**
> (a) Call with Arcadia Systems today, dan@arcadiasys.com and me. They liked the pilot results, asked for a 2-year price. I'll send the quote by Thursday. Dan needs to check with finance on budget timing.

*[One meeting entry: title "Call with Arcadia Systems", date 2026-06-12, attendees dan@arcadiasys.com + user, `source: manual`, `meeting-ref: manual-20260612-call-with-arcadia-systems`]*

**Step 4–5 — boards and match**
*[Deals board resolved; active deals pulled]*
- `arcadiasys` matches company "Arcadia Systems" → 5 → **matched** (deal 6620410)

**Step 6 — synthesize**
- Key points: pilot results well received; 2-year pricing requested.
- Commitments: Sarah → send 2-year quote (due Jun 18).
- Open questions: budget timing (Dan checking with finance).
- Stage signal: none.

**Step 7**
*[`get_updates({ objectType: "Item", objectIds: ["6620410"], limit: 50 })` → no hit]*
> I'll write 1 recap · 0 stage edits · 1 last-touch date. Proceed? (yes / show details / skip column edits / no)

**User:** yes

*[`create_update({ itemId: 6620410, body: "<h3>Meeting recap — Call with Arcadia Systems</h3><p><i>Jun 12, 2026 · 2 attendees · ref meeting-to-deal/manual-20260612-call-with-arcadia-systems</i></p>…" })`]*
*[`change_item_column_values(…last-touch 2026-06-12…)`]*
*[Step 10: sync doc created]*

Synced 1 meeting to 1 deal. 0 unmatched, 0 ambiguous, 0 contacts created. Doc: https://your-account.monday.com/docs/…

---

## What this example demonstrates

- A failed Notetaker probe never stops the skill; Step 3b collects the meeting from the user.
- A gmail.com user gets `internal_domain = none`, so external free-mail attendees are not misread as colleagues.
- Manual meetings get a `manual-<date>-<slug>` reference, so re-running with the same notes does not duplicate the recap.
- A user who only wants to dictate one short note onto a deal ("log a call with Arcadia") belongs in log-activity; this skill is for meeting recaps from Notetaker or a pasted transcript.

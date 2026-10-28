---
name: win-loss-review
description: >
  Explain why a closed monday CRM deal was won or lost. Reads the deal's stage history, Emails & Activities timeline, notes and column changes, compares it with other closed deals on the same board, and writes a short evidence-based review. Use when someone asks "why did we win/lose Acme", "win-loss review for this deal", "closed-lost analysis", "what was the loss reason really", "what went wrong with this deal", "post-mortem on this opportunity" or "what can we learn from this closed deal". Works on one closed deal at a time. Not for open deals (those need a pipeline or deal-health check, not a post-mortem).
argument-hint: "[closed deal name or link — 'why did we lose Acme', 'win-loss review for this deal']"
user-invocable: true
allowed-tools: [Read, AskUserQuestion, mcp__monday__get_user_context, mcp__monday__search, mcp__monday__get_board_info, mcp__monday__get_column_type_info, mcp__monday__get_board_items_page, mcp__monday__get_board_activity, mcp__monday__get-timeline-items, mcp__monday__extract_signals, mcp__monday__get_updates, mcp__monday__search_meetings_content, mcp__monday__get_meetings_content, mcp__monday__change_item_column_values, mcp__monday__update_items, mcp__monday__create_column, mcp__monday__create_doc, mcp__monday__get_asset_upload_url, mcp__monday__finalize_asset_upload]
---

# Win / loss review

Produce an evidence-based explanation of why one closed deal was won or lost. Every claim must point to something you read. If the evidence is thin, say so instead of guessing.

## 0. Rules

- Reading is free. Writing (board columns, new columns, files, docs, timeline notes) happens only after the user confirms the exact values (step 7c). The recommended path is to save the result on the deal item, so offer it once, clearly, and do not nag.
- Never assume board, column or label names. Discover them (step 2).
- Never invent a reason. People act on these reviews, so a finding needs at least one cited data point (a stage change, an email, a note, a number).
- Mark the deal outcome from the data, not from the user's wording, and tell the user if they differ.
- One deal per run. If the user asks for several, run them one after another and keep each result separate. Do not write one deal's data into another item.
- Connector check first: call `get_user_context`. On error, tell the user to install and connect the monday MCP connector, and stop.

## 1. Ask the first-run questions (once per conversation, before any analysis)

Skip any question the user already answered or said "always" or "never" about. Ask both in one message and remember the answers.

1. **Depth:** "Short analysis or deep analysis?"
   - **Short (default):** bottom line, key facts, do-next-time.
   - **Deep:** adds the full stage timeline, week-by-week activity, ranked drivers with dated evidence and a full comparison with other closed deals.
2. **Board update (recommended):** "Should I save the result on the deal item in monday, so the review stays with the deal and your team can see and report on it?" Options: yes (recommended), or no (chat and artifact only).

If the user is unsure, recommend yes and short. The deal can be identified (step 2.1) while waiting, but do not start the heavy reads (steps 3 to 5) until depth is answered.

## 2. Find the deal and the board structure

1. Resolve the deal: item link, or search by name. If several match, list them (name, owner, value, stage) and ask which one.
2. Call `get_board_info` (columns only) for the deal's board. Identify by column type, not by title:
   - Stage: the status column used for the pipeline (labels like New, Discovery, Proposal, Negotiation, Won, Lost).
   - Owner: people column. Value: numbers column. Expected close date: date column. Close probability, last interaction date, loss reason (dropdown or status) if present.
   - Contacts and accounts: board-relation column.
   - Activities timeline: a column of type `unsupported`. It cannot be read as a column value. Use the timeline tool.
   - A long text column, if the user wants to write there (step 7c).
3. Confirm the outcome: current stage label (Won or Lost) and group (for example "Closed Won"). Classify unusual endings explicitly: "no decision" or "went dark" is a loss, a deal that was reopened is judged by its latest close, and a deal won and later churned is judged on the win only (mention the churn).
4. If the deal is not closed, stop and tell the user a post-mortem needs a closed deal. Offer to review it once it closes, or to look at its current health instead.

## 3. Read the stage history

Call `get_board_activity` with the board id, `itemIds` set to the deal, `includeData: true` and a `fromDate` early enough to cover the deal's creation (use the item's `created_at`, or one year back). Page through the results, up to about 300 events; if there are more, say the history is truncated.

From the events, build an ordered list of stage changes:

- `update_column_value` events on the stage column. `previous_value.label.text` is the old label, `value.label.text` the new one.
- `move_pulse_from_group` events for group moves (for example Active Deals to Closed Won).
- `create_pulse` for creation and its source (form, import, manual).
- Owner changes (`update_column_value` on the people column).
- Changes to value, expected close date and close probability.

The `created_at` field on events is a 17-digit monday timestamp. Divide by 10,000,000 to get Unix seconds. If the response says no activity was found, say that stage history is unavailable and continue with step 4.

Compute:

| Signal | How |
|---|---|
| Stage changes | Count of stage changes, and how many were backward moves (for example Negotiation back to Proposal) |
| Time per stage | Days between consecutive stage changes. Flag the longest stage |
| Total cycle | First entry into the pipeline to close, in days. For imported or bulk-created items the creation date can be misleading, so prefer the first stage change and say which you used |
| Close-date slips | Number of times expected close date moved later, and total days pushed |
| Value changes | Start value, final value, direction and size of each change |
| Probability drift | Close probability at each stage change, if tracked |
| Owner changes | Count and timing. A handover close to the close date is a risk signal |
| Skipped stages | Pipeline stages never visited |
| Who changed it | If automations or other users changed the stage, note it |

## 4. Read the Emails & Activities timeline

Call `get-timeline-items` for the deal id and page through the results with the cursor, up to about 200 items. If there are more, work from the most recent 200 plus the first 20 and say the timeline is truncated. Do not use the "count timeline events" column.

Classify each item by `type`: email, meeting, phoneCall, note, aiSummary, sequencesEmail, custom and others. Content may be HTML; strip tags before reading.

Compute:

| Signal | How |
|---|---|
| Activity volume | Count by type, and per stage if you can map dates to the stage history |
| Cadence | Average days between touches. Longest silent gap and when it happened |
| Last touch before close | Days between the last activity and the close |
| Responsiveness | For emails, inbound versus outbound counts and the typical reply lag in each direction |
| Multi-threading | Distinct contacts involved. A single-threaded deal is a risk signal |
| Meetings | Number held, and whether a meeting happened in each late stage |
| Customer voice | Objections, budget, timing, competitors, champions, blockers (see the privacy note below) |
| Rep voice | Commitments, promised follow-ups, whether they were done |

For customer and rep voice, also call `extract_signals` with `itemId` set to the deal, `resourceTypes: ["email_thread", "video_meeting", "phone_call", "activity"]`, `signalTypes: ["blocker", "objection", "buying_signal", "commitment", "stakeholder", "decision"]` and `timeWindowDays` covering the full cycle (close date minus first stage change, plus a week). Each signal cites its `communicationEventsIds`, so it counts as evidence. Use it to find objections, competitors, champions and promised follow-ups faster, and check the strongest ones against the timeline items. If it errors or returns nothing, carry on from the timeline alone.

If the item has meeting recordings or summaries, read them with `search_meetings_content` / `get_meetings_content`. Prefer these over guessing from titles.

Also read item updates with `get_updates` (item) and the loss-reason column if one exists. Treat free-text reasons as a claim to test against the evidence, not as the answer.

**Privacy note:** the result may be saved where the whole board can read it. Quote customers sparingly (a short phrase, not a full email), and leave out personal details such as private phone numbers or unrelated personal remarks.

## 5. Compare with other closed deals

On the same board, read closed deals with the same outcome and the opposite outcome from the last 6 to 12 months (`get_board_items_page` with a stage or group filter; get filter rules from `get_column_type_info` first). Use only stage history and activity counts, never full text.

Keep the cost in check, because each deal needs its own history and timeline calls:

- **Short mode:** about 8 deals per side. Prefer what the board already gives you (created and close dates, value) and only pull the timeline for the counts you actually quote.
- **Deep mode:** about 20 deals per side.

Report medians for: cycle length, days in the stage where this deal spent the most time, activity count, contacts involved. State how far this deal sits from the median of won deals and of lost deals. If fewer than 5 comparison deals exist on a side, say the benchmark is weak.

## 6. Reason about the outcome

Group evidence into drivers. Use this checklist and report only the drivers that have evidence:

- **Momentum**: stalls, long stages, backward moves, close-date slips.
- **Engagement**: silence gaps, falling cadence, unanswered customer emails.
- **Stakeholders**: single contact, no economic buyer or champion visible, owner handover.
- **Value and fit**: discounting, scope changes, budget or pricing objections.
- **Competition**: competitor names in emails, notes or meetings.
- **Timing and process**: missing stages, late legal or security steps, customer-side delays.
- **Execution**: missed follow-ups, slow replies, no next step set.
- **Won deals**: what worked, in the same categories, so others can repeat it.

Rank drivers by strength of evidence. Label each as strong (two or more independent sources), moderate (one clear source) or weak (inferred). Give one top driver and up to three supporting drivers. Add an "unknowns" line for what the data could not show (for example calls that were never logged).

**Overall confidence:**
- **High:** the top driver is strong, and the comparison has at least 5 deals per side.
- **Medium:** the top driver is moderate, or the benchmark is weak.
- **Low:** the top driver is weak, or stage history or the timeline is missing or truncated.

## 7. Output

The goal is that the answer lives on the board, where the team works. Chat is the quick view.

### 7a. Short answer in chat (always, first)

Bullets only, at most 10 bullets, no paragraphs. For deep mode, keep this same chat summary and put the extra detail in the artifact.

```
WIN/LOSS: <deal> | <Won|Lost> | <value> | <owner>

BOTTOM LINE
- <One sentence: why it was won or lost. Name the top driver.>

KEY FACTS
- Cycle: <N> days (median for <won|lost> deals: <N>)
- Stages: <N> changes, longest in <stage> (<N> days)
- Engagement: <N> touches, longest silence <N> days, <N> contacts
- <One more fact that supports the bottom line>

DO NEXT TIME
- <Specific action 1>
- <Specific action 2>

Confidence: <High|Medium|Low>. Gaps: <short, or "none">
```

The bottom line comes first and fits in one sentence. Every number comes from the data. If evidence is thin, lower the confidence and say what is missing. Use a neutral tone: describe behaviors and timing, not people.

### 7b. Artifact

Create a single-deal page with the bottom line, metric tiles (cycle vs median, stage changes, longest silence, contacts, close-date slips), the stage-path bar, touches per week, ranked drivers with strength and dated evidence, what to repeat, what to do differently, data gaps and sources. In short mode, build the compact version: bottom line, key facts and do-next-time.

Use the artifact tool if this environment has one. If not, write the same content as a self-contained HTML file and tell the user where it is, or if that is not possible, say the chat summary is the only output. Never show invented numbers. Label missing data clearly.

### 7c. Update the board (only if the user chose yes in step 1)

If the user chose no, skip to 7e. This is the only place where you ask for write confirmation, so make it count.

**Step 1: find the columns.** Use the column list from step 2. Match by column type and by meaning of the title, not exact names:

| Field | Best column type | Notes |
|---|---|---|
| Full analysis text | Long text | Short mode: the 7a text. Deep mode: the 7a text plus top drivers, under 3,000 characters |
| Win or loss reason | Status or dropdown | Suggest the closest existing label. Never create new labels without asking |
| Top driver | Dropdown, status or text | Optional |
| Cycle length (days) | Numbers | Optional |
| Longest silence (days) | Numbers | Optional |
| Artifact | Link, files, or monday doc column | See "Saving the artifact" below |

Do not overwrite a column that already has content without showing the old value and asking.

**Step 2: if columns are missing, offer to build them.** Adding columns changes a shared board, so list what is missing with the column type and a name, for example: "I couldn't find a place for the analysis. I suggest adding: Win/Loss Analysis (long text), Win/Loss Reason (dropdown), Cycle Days (numbers), Review Artifact (link). Want me to create these?" On a yes, create them with `create_column` (check `get_column_type_info` for the right settings). If the user declines, write only to the columns that exist and say what was left out.

**Step 3: show and confirm.** Show the exact values per column and wait for a yes. Then write with `change_item_column_values` (or `update_items`). After writing, confirm in one line per column.

### Saving the artifact on the deal

After the artifact is created, suggest keeping it on the deal:

- **Link column (simplest):** put the artifact URL in a link column. Suggest creating one named "Win/Loss Review" if missing.
- **Files column:** attach the artifact as a file so it travels with the deal. Suggest creating a files column if missing. Use the asset upload tools (`get_asset_upload_url`, then `finalize_asset_upload`). If the artifact cannot be exported as a file here, fall back to the link.
- **monday doc column:** create a monday doc on the item with the review text and the artifact link at the top, and place it in a doc column. Use `create_doc` and attach it to the item.

Ask which one the user prefers, name your recommendation (link plus doc), and wait for a yes before creating columns or files.

### 7d. Optional document

If the user asks for a document, create one as a Google Doc, Word document or another format they name, using the matching skill or connector. Include the deep analysis if it was run. Show what will be created and wait for a yes.

### 7e. Closing

State in one line each where the result now lives: chat, artifact, board columns updated, doc or file attached. If nothing was saved to the board and the user had not already said no, mention once that it can be saved later. Do not ask again.

## 8. After the run

In one line, tell the user what was read (stage events, timeline items, comparison deals, and anything truncated) and what was saved where. Offer one follow-up: run the same review on another closed deal.

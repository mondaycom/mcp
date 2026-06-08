# Morning Briefing — Sample Output

Captured from a live run of `/monday-crm:morning-briefing` against Tom Ramu's `Deals` board (id `10046221612`) on 2026-05-07.

The board contained 5 items (CRM template seed: Google / Apple / Amazon deals), so this output exercises the "everything is slipping, no owners attached, no recent activity" edge of the skill rather than a healthy pipeline. Useful as a UI baseline for empty/degraded states.

---

# CRM Morning Brief — Thursday, May 7

## Pipeline at a glance
- **Active pipeline:** $225K across 3 deals
- **Forecast (weighted):** $133K
- **Closing this week:** 0 deals

## Needs you today

### ⚠️ Slipping (3)
- **Amazon deal** — Proposal, $100K, expected 2025-09-20 (~230 days overdue), 70% probability, last touch ~21 months ago
- **Google deal** — Discovery, $70K, expected 2025-11-10 (~179 days overdue), 90% probability, last touch ~9 months ago
- **Apple deal** — Discovery, $55K, expected 2025-12-08 (~151 days overdue), no probability set, no last-interaction date

### 💤 Going cold (3)
All three slipping deals are also stale — no interaction in the last 14+ days. (Same list as above.)

---

## Run metadata

| Field | Value |
|---|---|
| Board | Deals (10046221612) |
| Workspace | CRM (12369991) |
| Items pulled | 5 (3 active, 2 won) |
| Date columns | `deal_expected_close_date`, `date__1` (Last interaction) |
| Stage column | `deal_stage` — labels: New, Discovery, Proposal, Negotiation, Won, Lost |
| Owner column | `deal_owner` — **empty on all rows** (degraded mode) |
| Skill version | 0.1.0 |
| Run timestamp | 2026-05-07 |

## Categorization buckets (as computed)

| Bucket | Count | Items |
|---|---|---|
| 🔥 Hot | 0 | — |
| ⚠️ Slipping | 3 | Amazon, Google, Apple (Discovery) |
| 💤 Stale | 3 | (same as Slipping — surfaced under Slipping per skill priority) |
| 🆕 New | 0 | — |
| 📞 Follow-up | 0 | — |

## Observations from this run (for skill v0.2)

1. **Small-board fast path.** With `items_count ≤ 25`, skipping the three filtered passes and pulling everything in one call saves API round-trips. Worth codifying in the skill.
2. **Empty-owner degradation.** When `deal_owner` is empty across the board, the brief should call out "no owners assigned" once at the top instead of leaving every line silent.
3. **Yesterday's-movements suppression.** Worked correctly — no section was printed when no items were updated in the last 24 hours.
4. **Bad-demo-data risk.** Default CRM template seed is a poor showcase (everything slipping, no owners). For demos, the skill should detect the template and either flag it or point at a populated board.

# daily-briefing — output config

Loaded by `SKILL.md` Step 1. Every field is optional. Precedence: this run's prompt → the user's saved preferences (for example a `CLAUDE.md` or project-instructions block, see below) → defaults. A one-off phrase like "quick brief" applies to this run only.

## Destination (default: `chat`)

| Value | Behavior | Phrases |
|---|---|---|
| `chat` (default) | Brief in chat only. No monday write, no confirmation needed. | anything not asking to post |
| `monday` | Brief in chat **and** posted to monday (update on a "My Morning" item if one exists, else a private doc). One confirmation before the write in Default mode. | "post my briefing to monday", "publish the brief", "save it in monday" |
| `doc` | Like `monday`, but always a private doc. | "morning briefing doc", "put it in a doc" |

## Verbosity (default: `full`)

| Value | Content | Phrases |
|---|---|---|
| `full` | All enabled sections. | — |
| `quick` | `pipeline_totals` (or the at-a-glance line) + Tasks due today + Needs you today, top 2 items per bucket, one line each, headers as `Slipping (6, top 2)`. Hard cap 25 lines including headers. | "quick brief", "quick morning briefing" |
| `tldr` | One paragraph: the top priority, one number, one action. | "tldr", "tldr my day" |

## Sections (default: all on except `new_this_week`)

| Key | Section in the template |
|---|---|
| `pipeline_totals` | Pipeline at a glance / Relationships at a glance / Leads at a glance |
| `yesterday_movements` | Yesterday's movements |
| `tasks_today` | Tasks due today |
| `needs_action` | Needs you today (all action buckets) |
| `recent_meetings` | Recent meetings (Notetaker, last 24h) |
| `activity_summary` | Activity line (calls, emails, meetings, notes logged) |
| `on_track` | On track |
| `new_this_week` | New this week (off by default) |
| `data_hygiene` | Data hygiene |

Natural-language overrides work per run ("skip yesterday's movements", "only what needs attention"). A section with no items is always omitted — never print an empty header or "(none)".

## Style (default: `bullets`)

- `bullets` — headers and bullets.
- `tables` — deal lists as `| Deal | Stage | Value | Alert |` tables ("morning briefing table format").
- `prose` — 1–2 sentences per section, no headers ("morning briefing prose").

## Saving preferences

Users who want a fixed setup can add this to their `CLAUDE.md` (Claude Code) or project instructions (claude.ai):

```yaml
monday-crm daily-briefing:
  destination: monday
  verbosity: quick
  sections:
    yesterday_movements: false
    new_this_week: true
  style: tables
```

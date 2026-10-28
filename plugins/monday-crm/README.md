# monday CRM — Claude plugin

Run your sales pipeline in monday CRM from plain language. Ten skills read
your live monday boards via the official monday MCP connector, synthesize
insights, and write the result straight back into monday as a real board,
dashboard, or doc — so work stays inside monday.

## Try asking…

- "Give me my CRM deal briefing for today"
- "Build a sales forecast from my pipeline"
- "Turn my meeting notes into a deal update"
- "Set up a CRM pipeline from scratch"
- "Run a health check on my CRM board"
- "Find and clean up duplicate deals in my CRM"
- "Create a 3-step follow-up sequence and enroll my new leads"
- "Log my call with Acme: they want pricing by Friday"
- "How many calls did each rep log last week?"
- "Why did we lose the Globex deal?"
- "When a deal moves to Won, notify the account owner"

## Skills

| Skill | What it does | Trigger phrases |
|---|---|---|
| `daily-briefing` | Prioritized daily deal briefing → monday update | "morning briefing", "what should I focus on today", "pipeline summary" |
| `forecast` | Commit / best-case / pipeline → monday dashboard | "build me a forecast", "show me Q2 pipeline", "commit vs best-case" |
| `meeting-to-deal` | Meeting transcripts → deal updates + stage signals | "log my meetings to deals", "sync notetaker", "update CRM from calls" |
| `workspace-builder` | CRM workspace from scratch → boards + columns + stages | "build me a CRM from scratch", "create CRM boards for me", "set up my pipeline" |
| `data-cleanup` | Board health check (report) + bulk data fixes → doc + writes | "run a board health check", "clean my CRM", "fix my data", "what's broken in my CRM" |
| `run-sequence` | Create, enroll, activate, and track email sequences | "create a sequence", "enroll this lead", "how is my sequence performing" |
| `log-activity` | Log calls, meetings, and notes to item timelines; read activity history | "log my call with", "add a note to the deal", "what happened on this account" |
| `activity-insights` | Team activity analytics: volume by rep and type, rep comparisons | "how many calls did my team make", "compare reps", "activity this week" |
| `win-loss-review` | Post-mortem on one closed deal: stage history, activity timeline, comparison with other closed deals | "why did we lose Acme", "win-loss review for this deal" |
| `automate-crm` | Create and manage board automations in plain language | "when a deal is won, notify", "automate my follow-ups", "list my automations" |

## How it works

```
┌─────────────────┐     OAuth      ┌─────────────────┐
│   Claude Code   │ ──────────────▶│  monday MCP     │
│  (10 skills)    │                │  mcp.monday.com │
└─────────────────┘                └────────┬────────┘
                                            │
                                   ┌────────▼────────┐
                                   │  monday.com     │
                                   │  boards, docs,  │
                                   │  dashboards     │
                                   └─────────────────┘
```

The plugin bundles a `.mcp.json` that points at the remote monday MCP
server (`https://mcp.monday.com/mcp`). On first use, Claude Code prompts
for OAuth — no API tokens to manage. Skills then compose the MCP's tools
(`get_user_context`, `get_board_items_page`, `create_update`, etc.) into
multi-step workflows.

## Install

### From the community plugin directory (after acceptance)

```bash
# Add the community marketplace (one-time)
claude plugin marketplace add anthropics/claude-plugins-community

# Install the plugin
claude plugin install monday-crm@claude-community
```

### From the monday marketplace (GitHub)

```bash
# Add the marketplace (one-time)
claude plugin marketplace add mondaycom/mcp

# Install the plugin
claude plugin install monday-crm@monday-mcp
```

### From a local directory (development)

```bash
# From a clone of mondaycom/mcp, add the repo root as a local marketplace
claude plugin marketplace add /path/to/mcp

# Install
claude plugin install monday-crm@monday-mcp
```

## Getting started

The plugin installs disabled. Enable it with
`claude plugin enable monday-crm@monday-mcp` (or from `/plugin`), then ask for what you need (e.g. "give me my CRM deal
briefing"). On first use, Claude prompts for OAuth to connect the bundled
`monday` MCP server via your browser — no API tokens to manage. Each skill
verifies the connection (`get_user_context`) and, if you don't have a CRM
board yet, routes you to `workspace-builder` to build one.

> **Don't have a monday account?** The plugin works with monday CRM's
> free tier. Start at https://monday.com/crm, then come back and ask for a
> deal briefing or to build a CRM workspace.

> **claude.ai users:** This plugin is designed for Claude Code (CLI and
> desktop app). If you're on claude.ai, you can install the plugin but
> skill invocation works via natural language only (no `/` commands).
> Some features that depend on local file access may be limited.

## Modes

The pipeline skills (`daily-briefing`, `forecast`, `meeting-to-deal`,
`data-cleanup`, `workspace-builder`) support three interaction modes:

| Mode | Behavior |
|---|---|
| **Default** | Confirm before every write. Safe for first-time use. |
| **Silent** | Skip confirmations for the skill's primary output. Extended actions (stage edits, contact creation) still ask. |
| **Proactive** | Session-level approval for writes + extended actions (stage edits, contact creation, fix-tasks). |

Set mode by saying e.g. "morning briefing in proactive mode". Default
applies when unspecified.

## Safety rails

The pipeline skills enforce the rails below. The other skills confirm
before every write, as described in each skill.

- **No deletes** — never removes items, columns, or boards.
  (`workspace-builder` may remove the empty default group on a board it
  just created, after you confirm.)
- **No amount-column writes** — forecast integrity; amounts are flag-only.
- **No cross-workspace moves** — items stay in their workspace.
- **Batched confirm** — record-level writes are bundled into a single
  confirm plan (Default mode) or a session-level approval (Proactive mode).

## License

MIT

# monday CRM — Claude plugin

Run your sales pipeline in monday CRM from plain language. Five skills read
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

## Skills

| Skill | What it does | Trigger phrases |
|---|---|---|
| `daily-briefing` | Prioritized daily deal briefing → monday update | "morning briefing", "what should I focus on today", "pipeline summary" |
| `forecast` | Commit / best-case / pipeline → monday dashboard | "build me a forecast", "show me Q2 pipeline", "commit vs best-case" |
| `meeting-to-deal` | Meeting transcripts → deal updates + stage signals | "log my meetings to deals", "sync notetaker", "update CRM from calls" |
| `workspace-builder` | CRM workspace from scratch → boards + columns + stages | "build me a CRM from scratch", "create CRM boards for me", "set up my pipeline" |
| `data-cleanup` | Board health check (report) + bulk data fixes → doc + writes | "run a board health check", "clean my CRM", "fix my data", "what's broken in my CRM" |

## How it works

```
┌─────────────────┐     OAuth      ┌─────────────────┐
│   Claude Code   │ ──────────────▶│  monday MCP     │
│  (5 skills)     │                │  mcp.monday.com │
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

### From a marketplace (GitHub)

```bash
# Add the marketplace (one-time)
claude plugin marketplace add https://github.com/<org>/<repo>

# Install the plugin
claude plugin install monday-crm@<marketplace-name>
```

### From a local directory (development)

```bash
# Add a local marketplace pointing at the plugin directory
claude plugin marketplace add ./path/to/plugin

# Install
claude plugin install monday-crm@<local-marketplace-name>
```

## Getting started

After installing, just ask for what you need (e.g. "give me my CRM deal
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

Every skill supports three interaction modes:

| Mode | Behavior |
|---|---|
| **Default** | Confirm before every write. Safe for first-time use. |
| **Silent** | Skip confirmations for the skill's primary output. Extended actions (stage edits, contact creation) still ask. |
| **Proactive** | Session-level approval for writes + extended actions (stage edits, contact creation, fix-tasks). |

Set mode by saying e.g. "morning briefing in proactive mode". Default
applies when unspecified.

## Safety rails

All skills enforce:

- **No deletes** — never removes items, columns, boards, or groups.
- **No amount-column writes** — forecast integrity; amounts are flag-only.
- **No cross-workspace moves** — items stay in their workspace.
- **Batched confirm** — record-level writes are bundled into a single
  confirm plan (Default mode) or a session-level approval (Proactive mode).

## License

MIT

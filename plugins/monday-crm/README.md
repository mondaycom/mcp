# monday CRM — Claude plugin

Run your monday CRM in plain language. Seven skills read your live monday
boards via the official monday MCP connector, synthesize insights, and
publish a monday-native artifact (update, doc, or dashboard) — so work
stays inside monday.

## Skills

| Skill | What it does | Trigger phrases |
|---|---|---|
| `setup` | First-run OAuth connection for the bundled monday connector | "connect my monday account", "set up monday CRM", "monday CRM setup" |
| `morning-briefing` | Daily pipeline digest → monday update | "morning briefing", "what should I focus on today", "pipeline summary" |
| `forecast-dashboard` | Commit / best-case / pipeline → monday dashboard | "forecast dashboard", "show me Q2 pipeline", "commit vs best-case" |
| `board-diagnosis` | Five-strand data-quality audit → monday doc | "audit my CRM board", "diagnose the pipeline", "what's wrong with my board" |
| `bulk-data-hygiene` | Phone, email, country normalization + bulk-set → writes | "clean my CRM", "normalize phone numbers", "fix data" |
| `workspace-builder` | CRM board setup from scratch → boards + columns | "build me a CRM from scratch", "create CRM boards for me", "set up my first monday CRM" |
| `meeting-to-opportunity` | NoteTaker transcripts → deal recaps + stage signals | "log my meetings to deals", "sync notetaker", "update CRM from calls" |

## How it works

```
┌─────────────────┐     OAuth      ┌─────────────────┐
│   Claude Code   │ ──────────────▶│  monday MCP     │
│  (7 skills)     │                │  mcp.monday.com │
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

## First-run setup

After installing, run `/monday-crm:setup` (or ask "connect my monday
account"). Claude will:

1. Check whether you have a monday.com account. If not, direct you to
   the free tier at https://monday.com/crm.
2. Check whether the bundled `monday` MCP server is connected.
3. If not, prompt you to complete OAuth via the browser pop-up.
4. Verify the connection by calling `get_user_context`.
5. Detect whether you have existing CRM boards and route you to the
   right next skill — operate-mode skills for existing users,
   `workspace-builder` for blank-slate users.

> **Don't have a monday account?** The plugin works with monday CRM's
> free tier. Start at https://monday.com/crm, then come back and run
> `/monday-crm:setup`.

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

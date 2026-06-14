---
name: setup
description: Get started with monday CRM — connect your account and discover which skills work with your existing boards (or build from scratch). Use when someone says "set up monday CRM", "connect my monday account", "monday CRM setup", "get started with monday CRM", "I just installed the monday plugin", "how do I use this", "what can you do with monday", or "help me get started".
user-invocable: true
allowed-tools: [Read, AskUserQuestion, mcp__monday__get_user_context, mcp__monday__search, mcp__monday__list_workspaces, mcp__monday__get_board_info, mcp__monday__all_monday_api]
---

# monday CRM — Setup

Guide the user through first-run connection of the bundled monday MCP connector, then triage whether they are an existing CRM user or a new one.

**This skill is read-only.** It never writes to monday — only checks the connection and reads board metadata.

---

## Step 1: No-account detection

Before attempting the MCP connection, ask the user:

> **Welcome to the monday CRM plugin.**
> This plugin connects Claude to your monday.com CRM boards via the official monday MCP connector.
>
> Do you have a monday.com account? (yes / no / not sure)

- **yes** → continue to Step 2.
- **no** →

  > Don't have a monday account yet? Start a free 14-day trial at **https://monday.com/crm**.
  > Once your account is set up, come back and run `/monday-crm:setup` to connect it here.

  Stop.
- **not sure** →

  > No worries — let's try connecting. If you don't have an account yet, the OAuth flow includes a sign-up option.

  Continue to Step 2.

---

## Step 2: Check connector status

Call `mcp__monday__get_user_context`.

The response contains `name` and `email` fields — extract these for use as `{user.name}` and `{user.email}` in later steps.

- **Success** → the monday MCP connector is already connected. Continue to Step 4 (Triage).
- **Auth error / token missing** → the connector is registered but not authorized. Continue to Step 3.
- **Tool not found** → the monday MCP server is not registered at all — the plugin may not be installed. Skip directly to Step 5.

---

## Step 3: Prompt OAuth connection

Print:

> The monday CRM plugin needs the monday MCP connector to be authorized.
>
> **To connect:**
> 1. Type `/mcp` in Claude Code.
> 2. Find `monday` in the server list.
> 3. Click **Connect** to start the OAuth flow.
> 4. Sign in to monday.com in the browser window that opens.
> 5. Come back here and say **"done"** when finished.

Ask via `AskUserQuestion`: "Have you connected the monday server? (done / I need help / skip for now)"

- **done** → call `mcp__monday__get_user_context` again. If it succeeds, continue to Step 4. If it still fails, go to Step 5.
- **I need help** → go to Step 5.
- **skip for now** → print: "No problem. Run `/monday-crm:setup` whenever you're ready." Stop.

---

## Step 4: Triage — existing CRM user or new user?

**Goal:** Detect whether the user already has CRM-shaped boards and route to the right next skill.

1. Call `mcp__monday__search` with query terms: `deals`, `pipeline`, `leads`, `contacts`, `opportunities`, `accounts`, `sales`.
2. Also call `mcp__monday__list_workspaces` to enumerate workspaces.
3. For each candidate board found, call `mcp__monday__get_board_info` to retrieve its item count.
4. Evaluate the results:

**If CRM-shaped boards are found** (boards whose names contain deal, pipeline, lead, contact, opportunity, account, sales, or similar CRM terms):

> monday MCP is connected. You're signed in as **{user.name}** ({user.email}).
>
> I found existing CRM boards in your workspace:
> {list board names with item counts}
>
> You're all set. Here are the skills that work with your existing boards:
> - `/monday-crm:morning-briefing` — daily pipeline digest
> - `/monday-crm:forecast-dashboard` — commit / best-case / pipeline view
> - `/monday-crm:board-diagnosis` — structural audit of your CRM board
> - `/monday-crm:bulk-data-hygiene` — clean and normalize your CRM data
> - `/monday-crm:meeting-to-opportunity` — sync meeting notes to deals
>
> Want to start with your morning briefing?

Stop.

**If no CRM-shaped boards are found** (the user has a monday account but no CRM setup):

> monday MCP is connected. You're signed in as **{user.name}** ({user.email}).
>
> I didn't find any CRM boards in your workspace yet. Would you like to:
> - **Build a CRM from scratch** — run `/monday-crm:workspace-builder` to set up deal boards, contacts, and pipeline stages tailored to your business.
> - **I already have CRM boards** — tell me the board name and I'll find it.
> - **Just exploring** — no problem. Run any skill when you're ready.

- **If the user provides a board name** → call `mcp__monday__search` with that name. If a match is found, confirm it and display the same skills list from the found-boards branch above. If no match is found, ask the user to check the board name in monday.com.

Stop.

---

## Step 5: Troubleshoot

Print:

> **Troubleshooting the monday MCP connection:**
>
> 1. **`monday` server missing from `/mcp` list** — the plugin may not be installed.
>    Check that a `monday-crm` directory exists in your `.claude/plugins/` folder and
>    that it contains a valid `MANIFEST.json`. If not, reinstall the plugin and restart
>    Claude Code.
>
> 2. **OAuth didn't open a browser** — if you're in a headless or remote
>    environment, OAuth may not redirect. Try running Claude Code on a
>    machine with a browser, or configure the monday MCP manually:
>    ```
>    claude mcp add --transport http monday https://mcp.monday.com/mcp
>    ```
>
> 3. **Workspace not visible** — the monday MCP app may not be installed
>    in your workspace. Visit the [monday MCP app](https://monday.com/marketplace)
>    in the marketplace and install it to your account.
>
> 4. **Still stuck** — reach out on the [monday community](https://community.monday.com/)
>    or check the [monday MCP repo](https://github.com/mondaycom/mcp) for known issues.

Stop.

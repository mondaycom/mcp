---
name: setup
description: Get started with monday CRM — connect your account and discover which skills work with your existing boards (or build from scratch). Use when someone says "set up monday CRM", "connect my monday account", "monday CRM setup", or "get started with monday CRM".
user-invocable: true
allowed-tools: [Read, AskUserQuestion, mcp__monday__get_user_context, mcp__monday__search, mcp__monday__list_workspaces]
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

  > No worries — let's try connecting. If you have an account, the OAuth flow will find it.

  Continue to Step 2.

---

## Step 2: Check connector status

Call `mcp__monday__get_user_context`.

- **Success** → the monday MCP connector is already connected. Continue to Step 4 (Triage).
- **Connection error / tool not found** → the monday MCP connector is not yet connected. Continue to Step 3.

---

## Step 3: Prompt OAuth connection

Print:

> The monday CRM plugin needs the monday MCP connector to work.
> This plugin bundles the connector — Claude Code will prompt you to
> authorize via OAuth in your browser.
>
> **What to expect:**
> 1. A browser window opens to monday.com.
> 2. Sign in (or approve if already signed in).
> 3. Grant the MCP app access to your workspaces.
> 4. The browser closes and you're back here.
>
> If the OAuth prompt didn't appear, you can trigger it manually:
> ```
> /mcp
> ```
> Look for the `monday` server in the list and click "Connect".

Ask via `AskUserQuestion`: "Ready to connect? (yes / I need help / skip for now)"

- **yes** → attempt `mcp__monday__get_user_context` again (the OAuth flow should have triggered automatically when the tool was called). If it succeeds, continue to Step 4. If it still fails, go to Step 5.
- **I need help** → go to Step 5.
- **skip for now** → print: "No problem. Run `/monday-crm:setup` whenever you're ready." Stop.

---

## Step 4: Triage — existing CRM user or new user?

**Goal:** Detect whether the user already has CRM-shaped boards and route to the right next skill.

1. Call `mcp__monday__search` with query terms: `deals`, `pipeline`, `leads`, `contacts`, `opportunities`, `accounts`, `sales`.
2. Also call `mcp__monday__list_workspaces` to enumerate workspaces.
3. Evaluate the results:

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

Stop.

---

## Step 5: Troubleshoot

Print:

> **Troubleshooting the monday MCP connection:**
>
> 1. **Check `/mcp` list** — the `monday` server should appear. If missing,
>    the plugin may not be enabled. Run:
>    ```
>    claude plugin enable monday-crm
>    ```
>    Then restart Claude Code or run `/reload-plugins`.
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

# SUBMISSION.md — monday-crm plugin submission runbook

Turn-key guide for submitting `monday-crm` to Anthropic's official Claude
plugin directory. **Tom executes these steps; Devin/Cursor prepared everything.**

**Hosting repo (locked):** `mondaycom/mcp` at `plugins/monday-crm/`, marketplace at `.claude-plugin/marketplace.json` (Rom Kadria approved 2026-06-03).

---

## Pre-submission checklist

Run these locally before submitting:

- [ ] `claude plugin validate ./plugins/monday-crm --strict` → clean (run from `mondaycom/mcp` repo root)
- [ ] `claude plugin validate . --strict` → clean (marketplace-level, from `mondaycom/mcp` repo root)
- [ ] Version in `plugin.json` is `0.2.0`
- [ ] CHANGELOG.md has a `[0.2.0]` entry
- [ ] README.md lists all 7 skills + bundled connector
- [ ] `plugin.json` has `defaultEnabled: false`
- [ ] `.mcp.json` has `"type": "http"` and `"url": "https://mcp.monday.com/mcp"`
- [ ] monday MCP OAuth tested: `claude mcp add --transport http monday https://mcp.monday.com/mcp` → connect → `/mcp` shows `monday` green
- [ ] `mcp__monday__get_user_context` tool works (verify tool name matches hosted server)
- [ ] All `mcp__monday__*` tool names in `allowed-tools` verified against hosted server inventory
- [ ] Plugin repo is **public** (required for GitHub-link submission)
- [ ] monday MCP is listed in the [Connectors Directory](https://claude.ai/settings/integrations) (note status — if not yet listed, mention in submission notes)

---

## Step-by-step submission flow

### 1. Hosting repo

**Locked:** `mondaycom/mcp` at `plugins/monday-crm/`. Approved by Rom Kadria 2026-06-03 (Slack). Marketplace catalog at repo root: `.claude-plugin/marketplace.json` (`monday-mcp` marketplace, forward-extensible for future monday plugins). Constraint: plugin must stay fully separate from server source — no imports from `packages/`.

### 2. Validate in the hosting repo

```bash
cd /path/to/mondaycom-mcp-clone
claude plugin validate ./plugins/monday-crm --strict
claude plugin validate . --strict
```

Both must pass clean.

### 3. Test locally via marketplace

```bash
# Add local marketplace (clone of mondaycom/mcp)
claude plugin marketplace add /path/to/mondaycom-mcp-clone

# Install
claude plugin install monday-crm@monday-mcp

# Verify: should show 7 skills + 1 MCP server
claude plugin details monday-crm@monday-mcp

# Clean up
claude plugin uninstall monday-crm@monday-mcp
claude plugin marketplace remove monday-mcp
```

### 4. Submit to Anthropic

1. Go to: **https://claude.ai/settings/plugins/submit**
2. Choose **"GitHub repository"** as the source type.
3. Enter: `https://github.com/mondaycom/mcp`
   - Path/subdirectory (if the form accepts one): `plugins/monday-crm`
4. Fill in submission details:
   - **Plugin name:** `monday-crm`
   - **Display name:** monday CRM
   - **Author:** monday.com
   - **Description:** Seven skills for monday CRM users — first-run setup, morning briefings, forecast dashboards, board diagnosis, bulk data hygiene, workspace setup, and meeting-to-opportunity sync. Composes the official monday MCP connector; no custom server, no new auth.
   - **Category:** CRM / Sales
5. Acknowledge the [Plugin Policy](https://www.anthropic.com/policies/plugin-terms).
6. Submit.

### 5. Post-acceptance

Once accepted into the official directory:

**Install command for users:**
```bash
claude plugin install monday-crm@claude-plugins-official
```

**Auto-updates:** The official directory mirrors the source repo on every push. Version bumps in `plugin.json` trigger update notifications for installed users.

**First-run:** Users should run `/monday-crm:setup` after installing to connect the monday MCP via OAuth.

---

## Notes

- **`defaultEnabled: false`** — the plugin installs disabled. Users enable it after connecting the monday MCP, which prevents errors from an unconnected server.
- **Setup skill** — `/monday-crm:setup` guides OAuth connection + troubleshooting. This is the recommended first-run path.
- **No secrets in the plugin** — `.mcp.json` carries only the endpoint URL. OAuth happens at connect time via Claude Code's built-in flow.
- **Connectors Directory status** — if the monday MCP is not yet in the Connectors Directory (`claude.ai/settings/integrations`), note this in the submission. The plugin still works (`.mcp.json` bundles the server), but Connectors Directory listing improves discoverability.

---

## Open questions / known gaps before public submission

### Resolved (round 2)

- [x] **New-user vs existing-user routing gap.** Resolved via option (c): setup skill now has a triage step (Step 4) that detects existing CRM boards and routes to operate-mode skills. workspace-builder trigger phrases tightened to only fire on explicit "build from scratch" intent. (2026-06-04)
- [x] **No-monday-account fallback.** Setup skill Step 1 now asks whether user has a monday account and routes no-account users to https://monday.com/crm. README updated with matching callout. (2026-06-04)

### Resolved (2026-06-04, post-PR)

- [x] **`claude plugin validate --strict` passes.** Both `./plugins/monday-crm` and `./` (marketplace, after adding `.claude-plugin/marketplace.json` at repo root) validate strict-clean against Claude Code CLI 2.1.161.
- [x] **Trigger-phrase activation tests pass.** 48-prompt CSV suite re-run with `claude-haiku-4-5` against round-2 descriptions. Result: 0 skill defects, 46/48 strict-pass under round-1 expected mapping; the 2 misses (`wb-exp-1` "set up my CRM", `wb-imp-1` "I'm new to monday") correctly route to `setup` instead of `workspace-builder` — this is the round-2 triage doing its job, and the CSV expected-values need a one-line update to reflect the new design. Round-1's single failure (`mo-imp-2`) is fixed.
- [x] **Cowork plugin UI display.** Confirmed working when Cowork installs via GitHub marketplace URL (the real-user path): plugin card, skills, and bundled MCP connector all render correctly. The "no skills shown" issue earlier in testing was specific to the local zip-upload path, which is not how external users install. No action needed.

### Open

_None blocking submission._

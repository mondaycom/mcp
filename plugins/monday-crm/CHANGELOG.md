# Changelog

All notable changes to the `monday-crm` Claude plugin are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.0] — 2026-06-14

### Changed
- **Skill set reshaped to the Anthropic knowledge-work plugin presentation (clean, job-shaped names).** Renamed `morning-briefing` → `daily-briefing`, `forecast-dashboard` → `forecast`, `meeting-to-opportunity` → `meeting-to-deal`, `bulk-data-hygiene` → `data-cleanup`. **Breaking:** slash-command invocations change accordingly.
- **`data-cleanup`** now does two jobs: a report-only **board health check** (scored 5-strand structural audit → diagnosis doc, no writes) and the existing bulk **fix** loop. Absorbs the former `board-diagnosis` skill.
- Plugin description (`plugin.json` + `marketplace.json`) rewritten value-first, leading with the jobs; keywords updated to the five skills.
- README: added a "Try asking…" section, restructured the skills table to five skills, replaced the setup walkthrough with a lighter "Getting started".

### Added
- `workspace-builder`: fetch and use the account-specific **numeric CRM product ID** for workspace creation (the `kind: "crm"` string alone doesn't bind the workspace to the CRM product); prefer existing CRM-named workspaces over creating new ones.
- `plugin.json` author `url` + `email`.

### Removed
- **`setup`** skill — first-run connection is handled interactively on first use (OAuth prompt), matching the Anthropic plugin pattern.
- **`board-diagnosis`** skill — folded into `data-cleanup` as a report-only health-check mode.

---

## [0.2.1] — 2026-06-08

### Fixed
- `plugin.json` `homepage`: was `https://monday.com/mcp` (404) → now points at the plugin's folder on GitHub.
- README install command: corrected `@claude-plugins-official` → `@claude-community` (the submission form lands plugins in the reviewed community marketplace, not the curated official one), and added the required `marketplace add anthropics/claude-plugins-community` step.

### Changed
- Plugin description (`plugin.json` + `marketplace.json`): rewritten to lead with what users can do instead of a skill count.
- README: reworded the "Silent" mode row to plain language (removed undefined α/β notation); aligned the intro line with the new description.

---

## [0.2.0] — 2026-06-04

### Changed
- **setup** skill: added no-account detection (routes to monday.com/crm signup), added CRM-board triage step that detects existing boards and routes to operate-mode skills instead of always suggesting workspace-builder.
- **workspace-builder** description: tightened trigger phrases — fires only on explicit "build from scratch" intent, no longer matches generic "set up my CRM" (now routed via setup triage).
- All skills: removed `../` cross-references to daily-briefing shared patterns; each skill now self-contains its own shared-patterns section for plugin portability.
- marketplace.json: updated to "Seven skills", added `displayName`, `tags`.
- plugin.json: bumped to 0.2.0.

### Added
- setup skill example (`01-first-time-connect.md`).
- Rubric scoring JSONs for all 7 skills (`plugin/tests/rubric/`).
- Trigger-phrase activation test stub (`plugin/tests/results/activation-2026-06-04.md`) — blocked on Claude API access.
- Phase reports: `phase1-grounding-notes.md`, `phase3-tool-parity-report.md`.

### Fixed
- Cowork UI bug: added Anthropic reviewer note to test via CLI/desktop, not Cowork.
- SUBMISSION.md: Cowork bug entry now includes reviewer-facing guidance.

---

## [0.1.0] — 2026-06-03

### Added
- **daily-briefing** — daily pipeline digest published as a monday update.
- **forecast** — commit / best-case / pipeline dashboard by close month.
- **board-diagnosis** — five-strand data-quality audit with fix-task generation.
- **data-cleanup** — phone, email, country-code normalization + bulk-set fixes.
- **workspace-builder** — CRM board setup from a business description.
- **meeting-to-deal** — NoteTaker meeting transcripts → deal recaps + stage signals.
- Bundled monday MCP connector (`.mcp.json` → `https://mcp.monday.com/mcp`, OAuth).
- `setup` skill for first-run connector guidance.
- `defaultEnabled: false` — user opts in after connecting the monday MCP.
- Trigger-prompt test CSVs for 6 operational skills.
- Example walkthroughs for all 7 skills.

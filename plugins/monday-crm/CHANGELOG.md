# Changelog

All notable changes to the `monday-crm` Claude plugin are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.6.1] — 2026-10-28

### Changed
- **One skill per phrase.** Descriptions now say which skill owns overlapping requests: `log-activity` records one call, meeting or note you describe; `meeting-to-deal` turns Notetaker recordings or pasted transcripts into deal recaps; `daily-briefing` is about today, `forecast` about periods ("pipeline summary" moved to `forecast`); `run-sequence` phrases say "sequence" and `automate-crm` points sequence requests there; `activity-insights` is for team and rep totals, not one item's history.
- **Activity data model, documented in the skills.** Single activities go to the item timeline (`log-activity`); meeting recaps go to the deal's updates feed (`meeting-to-deal`); `daily-briefing` now reads both, plus `get-timeline-items` for the items in "Needs you today", so activity logged on the CRM timeline counts as a touch.
- **`daily-briefing` shows the brief in chat by default.** Posting to monday (update on "My Morning" or a private doc) happens only when you ask ("post my briefing to monday"). Output config and templates moved to `references/`; SKILL.md is about 60% shorter. Synthesis buckets and template sections now match one-to-one; calendar and email "future" stubs removed; closing message reflects what actually happened.
- **`meeting-to-deal` restructured.** Silent mode writes recaps and the sync doc only; stage edits, last-touch dates, contacts and nudges need Default or Proactive. New step that writes confirmed stage and last-touch edits (existing labels only). Active deals defined inline with paging. Read-only branch for "what did I commit to". Templates moved to `references/templates.md`; duplicate output-template section removed.
- `meeting-to-deal` writes contacts with one `create_item` call (`name` + `columnValues`, deal link included, no hard-coded group), the sync doc as a private doc in the Deals board's workspace, and appends to the same-day doc with `update_doc`.

### Fixed
- `meeting-to-deal` internal domain: never defaults to a vendor domain; public mail providers (gmail.com, outlook.com and similar) are not treated as a company domain.
- `meeting-to-deal` idempotency uses a visible `ref meeting-to-deal/<meeting>` line near the top of each recap (HTML comments may be stripped and long bodies are truncated), checked with `get_updates`; recaps from older versions are recognized by title and date. One skill id throughout.
- `meeting-to-deal` no longer prompts to add a column it has no tool for; `all_monday_api` and `list_users_and_teams` removed from its allowed tools. `log-activity` drops unused `all_monday_api` and `list_workspaces`.
- `log-activity` maps calls and meetings to the account's real activity types and, when none fits, says before the write that it will log a prefixed note; the preview shows the title and timezone.
- `daily-briefing` no longer claims it can edit stage, owner or last-touch columns; "yesterday's movements" come from stage changes, not "updated in the last 24h"; one brief per target per day (reply or append on re-runs); all step references corrected.
- `meeting-to-deal` examples rewritten to the current rules (Notetaker-missing example continues to manual input instead of stopping; numeric ids; live tool arguments); `02-noteTaker-missing.md` renamed to `02-notetaker-missing.md`.
- Examples are now linked from every SKILL.md that has them.
- `meeting-to-deal` writes a deal's stage and last-touch edits before its recap, so a recap only says "Applied" for an edit that succeeded. Contacts are looked up before the confirmation, so the contact count shown there is real. Company matching uses explicit normalization and prefix rules, plus a mirrored account name or the deal name when there is no company column, and linked contacts' emails. Manual notes confirm the deal by name. Several meetings on one deal merge their column edits.
- `log-activity` resolves board names for search results and drops activity-log board rows; reads the timeline with a page size and cursor.
- `daily-briefing` maps `custom` timeline entries through `get-custom-activities`, checks Going cold / Follow-up / Slipping first and marks unchecked items, counts meeting-to-deal recaps as touches, matches meetings to their recaps, filters before de-duplicating buckets (tasks survive `quick`), widens the window to 7 days for stale leads, and skips a Proactive nudge on any deal nudged in the last 7 days. `daily-briefing` examples rewritten to the current steps.
- `list_workspaces` removed from `meeting-to-deal` and `daily-briefing` (unused).
- **Idempotency markers are now visible text.** A live write test showed monday strips `<!-- claude-skill-id -->` HTML comments from update bodies, so re-runs could not find earlier output and posted duplicates. `daily-briefing`, `meeting-to-deal`, `forecast`, `data-cleanup` and `workspace-builder` (and their examples) now use a visible `Generated by Claude · <skill>` footer (plus `ref meeting-to-deal/<id>` on recaps). Artifacts from earlier versions are matched by title. Verified live: the visible `ref` line and footer come back intact in `get_updates`; HTML comments are also dropped from `create_doc` markdown.
- `create_update` bodies are sent as one line of HTML: monday turns newlines between tags into extra `<br>` blank lines.
- Same-day doc checks (`meeting-to-deal`, `daily-briefing`, `data-cleanup`, `workspace-builder`) use `read_docs` by workspace, ordered by creation, with an exact-title match. A live test showed DOCUMENTS search misses a doc created minutes earlier, which would have created duplicate docs on re-runs.
- `run-sequence` (live test): `get-board-sequences` without `board_id` returns only your own sequences, so list output says so and find-by-name retries with the board; never adds `{{...}}` placeholders to email steps (a live test sent `{{name}}` literally) and warns when the user's copy has them; reports a failed `get-contact-journey` read instead of retrying.
- `forecast`: `create_dashboard` has no description field, so the skill no longer writes a marker there; an existing dashboard is found by exact name and creator (`search` DASHBOARDS); calls use the live arguments (`name`, `workspace_id`, `board_ids`).

---

## [0.6.0] — 2026-10-28

### Added
- **`win-loss-review`** — explains why one closed deal was won or lost from its stage history, Emails & Activities timeline, signals, notes and meetings, benchmarked against other closed deals on the same board. Uses `extract_signals` for customer and rep voice where the account has it, and falls back to the timeline otherwise. Short or deep mode; optionally saves the result on the deal item after explicit confirmation. Contributed by Dana Porat.

### Fixed
- Tool arguments that didn't match the connector schema: `search` in `log-activity`, `activity-insights`, `forecast`, `meeting-to-deal`, `daily-briefing` (`searchType` / `searchTerm`, `ITEMS`); `create_notification` in `daily-briefing`, `forecast`, `meeting-to-deal` and examples (`user_id`, `target_id`, `target_type`); `get_board_activity` / `get_updates` in `daily-briefing`.
- `create_update` bodies in `daily-briefing` and `meeting-to-deal` are posted as HTML (the tool doesn't render Markdown).
- `meeting-to-deal`: a company-domain match now scores enough to match on its own (with normalization, public mail domains ignored); ties ask the user instead of posting to both deals; 1:1s with external attendees are in scope; transcripts are fetched only for matched meetings. Examples recomputed to the rules.
- `run-sequence`: `get-board-sequences` is called without `board_id` to list or find sequences; the enroll confirmation says emails will go out and checks large batches.
- `win-loss-review`: signals window counted back from today; no paging assumption on `get_board_activity`; one confirmation for all board writes; questions asked after the deal is confirmed closed; HTML/doc fallback for deep mode; cross-skill handoffs.
- `win-loss-review`: classifies `custom` timeline entries by their activity type name, since many accounts log emails and meetings as custom activities. `run-sequence`: handles the `missing_config` sequence status.
- Removed cross-skill handoffs that pointed to behavior other skills don't have; removed internal planning references from `daily-briefing`.

### Changed
- `plugin.json` / `marketplace.json` descriptions and README list ten skills; added `win-loss` keyword.
- `plugin.json`: added `privacyPolicyUrl` (monday.com privacy policy), flagged by the plugin directory check.
- README: concrete install commands (`mondaycom/mcp`, `monday-crm@monday-mcp`), correct local-install path, enable step; modes and safety rails scoped to the skills that implement them.
- `automate-crm`, `data-cleanup`: last pre-0.3.0 skill names replaced; internal wording removed from `data-cleanup`.
- Added `.claude-plugin/icon.png` (1024×1024), the monday CRM app icon from monday.com's CDN, flagged by the plugin directory check.

---

## [0.5.1] — 2026-10-14

### Fixed
- `run-sequence`: removed `get-connected-email-accounts` (removed from the connector Oct 4). The `connections_not_specified` gate on `create-sequence` now returns the user's mailboxes; the skill passes the chosen `connectionId` + `provider` as `sender`. When no mailbox is connected it offers `show_connect_integration` and confirms with `check-integration-connection-status`. Handles `sender_not_found` / `sender_not_ready`.
- `log-activity`: removed `update-timeline-item` (hidden from all MCP clients since Aug 17). "Update" requests now append a correction note via `create-timeline-note`; the original entry is edited in the monday CRM UI. Corrected tool arguments to the server schema (`item_id`, `custom_activity_id`, `title`, `summary`, `content`, `timestamp`).
- `daily-briefing`, `meeting-to-deal`: replaced `get_notetaker_meetings` (removed from the connector Jul 6, mondaycom/mcp#421) with `explore_meetings` + `get_meetings_content`.
- Cross-skill handoffs pointed at pre-0.3.0 names (`board-diagnosis`, `forecast-dashboard`, `morning-briefing`, `meeting-to-opportunity`); now `data-cleanup`, `forecast`, `daily-briefing`, `meeting-to-deal`.
- `workspace-builder`: automations hand off to `automate-crm` instead of citing an unshipped tool.

### Changed
- `marketplace.json`: plugin entry version (was 0.3.0), description, and keywords now match `plugin.json`; marketplace description lists nine skills.
- README: nine skills in the table and diagram; "Try asking" covers sequences, activities, insights, and automations.
- Note: the `get-board-sequences` error rate flagged in 0.4.0 was fixed server-side on Jul 13.

---

## [0.5.0] — 2026-08-05

### Added
- **`activity-insights`** — analyze CRM activity data across the team: rep performance, call/email/meeting volume, per-type breakdowns, and rep comparisons. Uses `get-activity-insights` (now available on the public connector) to return aggregated counts server-side. Synthesizes results as natural language; redirects item-level content questions to `get-timeline-items`.

### Changed
- `log-activity`: removed the internal-only guard on `get-activity-insights`; the tool is now available on the public connector. Step 4 (Read) now routes aggregate/team queries to the `activity-insights` skill. Added `activity-insights` to cross-skill handoffs.

---

## [0.4.0] — 2026-07-12

### Added
- **`run-sequence`** — manage CRM sequences end-to-end: list, create, enroll contacts, activate/deactivate, duplicate, and track analytics. Requires `get-board-sequences` to be healthy on the connector (currently under investigation — 100% error rate on external connector as of Jul 7–11).
- **`log-activity`** — log calls, meetings, and notes to CRM item timelines; read activity history; update existing entries. Degrades gracefully to free-text notes if structured activity tools are unavailable.
- **`automate-crm`** — create and manage board automations in natural language; no block IDs or technical knowledge required. Uses aggregate account usage to surface the most common CRM automation patterns.

### Changed
- Plugin description updated to mention sequences, activities, and automations.
- Added keywords: `sequence`, `automation`, `activity`, `timeline`.

### Fixed
- `log-activity`: corrected v2 CRM tool names in `allowed-tools` from underscore to hyphen format (e.g., `get-timeline-items` not `get_timeline_items`).

---

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
- `defaultEnabled: false` — user opts in after connecting the monday MCP.

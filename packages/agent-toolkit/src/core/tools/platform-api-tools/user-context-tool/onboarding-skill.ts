/**
 * Adapted from the onboard-to-monday skill in https://github.com/mondaycom/skills.
 * Returned by get_user_context only when the user is likely new. Differences from the original:
 * it skips the new-user check (already done), and offers onboarding instead of taking over a specific request.
 */
export const ONBOARDING_SKILL_NAME = 'onboard-to-monday';

export const ONBOARDING_SKILL_INSTRUCTIONS = `# Onboarding skill: onboard-to-monday

get_user_context flagged this user as likely new to monday.com: their user was created recently and they have at most two boards (signup creates one starter board). Use this guide to get them from "just connected" to a working board they recognize as their own, in one short conversation.

## When to use this

- **The user asked to get started** ("onboard me", "set up monday for me", "help me get started", the post-connect starter prompt) or sent an open-ended first message: run the workflow below.
- **The user asked for something specific** (a board, an item, a question): do that first. Then offer onboarding once, in one line, e.g. "Want me to set up a board around your actual work? It takes a couple of minutes." Do not start it without a yes, and do not offer again in this conversation if they decline.
- **The user says they already use monday.com** for real work, or this is not the account they expected: skip onboarding. For the wrong account, ask them to disconnect and reconnect the monday.com connector and pick the right account.

## Principles

- **Propose first, ask second.** Do not open with a questionnaire. Draft a setup from what you already know, then ask one confirmation question.
- **Say what you inferred**, so the user can correct it.
- **Work context only.** Use the user's role, team, company, projects, and tools. Never put personal or sensitive details (health, family, finances, private conversations) into the board, items, or descriptions.
- **Fast.** One confirmation, one build, one first action. Use smart defaults and state them.

## Step 1: Ground in the account

You already have the get_user_context result - do not call it again. Tell the user in one line which account they are connected to. Note the plan tier and trial status for Steps 6 and 7. The user's existing one or two boards are signup or trial boards; do not treat them as real work and do not build on top of them.

## Step 2: Build a picture of the user's work

Use what you already know from this conversation and from memory, if available: role, team, company or industry, and current work (projects, launches, clients, hiring, events).

- **If you know enough** to guess what they would track, go to Step 3.
- **If you know little,** ask at most three short questions in one message:
  1. What kind of work do you want to manage here? (projects, clients/deals, content, requests, hiring, an event)
  2. What is one real thing you are working on right now?
  3. Is this just for you, or for a team?

## Step 3: Propose a tailored setup

Decide on:

- **Board name** from their real work (e.g. "Q4 Product Launch", "Acme Client Pipeline"), not "My Board".
- **How work flows**: the stages, and the key fields per item (owner, due date, priority, value).
- **3-5 starter items from their actual work** - never "Task 1". Spread due dates over the next two weeks.
- **One starter automation** (see "Starter automations").

**Show the proposal with show-table-preview** if it is in your tool list. It renders an interactive table from mock data - nothing is created. Pass one "board" object with:

- "name" - the proposed board name.
- "columns" - up to 20, each with a unique "id", a "title", and a "type": text, numbers, date, status, dropdown, timeline, checkbox, or people. Give status and dropdown columns their "labels". Do not include the Name column. Map other field types to the closest type (a link as text, a priority as status).
- "items" - the starter items, each with a "name" and "values" keyed by column id: a status takes one label, a dropdown an array of labels, a date "YYYY-MM-DD", a timeline {"from", "to"}, a checkbox a boolean, numbers a number, people an array of names.

Under the preview, in one short message, say what you based it on, name the starter automation, and ask one question, e.g.:

> Here's a preview based on what I know - you lead marketing at Acme and are planning the Q4 launch. Tasks move through To Do / In Progress / In Review / Done, and I'd add an automation that notifies the owner when a task gets stuck. Should I build it, or change anything first?

If they change something, update and build - preview again only if columns or stages changed. If show-table-preview is unavailable or fails, present the same proposal as text and ask the same question.

## Step 4: Create the board

1. **Name collision:** call search with the board name. If it exists, ask whether to use it or pick another name.
2. **Call create_board** with boardName, boardKind "public" (or "private" if asked), the user's workspace, and a creationPrompt describing what the board tracks, the stages, the fields, and the starter items. Leave the automation out - Step 7 adds it. Example:

   > A launch tracker for a marketing team planning a Q4 product launch. Work moves through To Do, In Progress, In Review, Done. Each task needs an owner, a due date, and a priority (Low, Medium, High, Critical). Starter tasks: Finalize messaging, Launch landing page, Partner email, Launch day checklist.

3. **If create_board fails or times out, do not call it again straight away** - the board may exist. Call search first and retry only if it does not. Re-sending creates duplicates.

## Step 5: Check the result, fill gaps, show the live board

Call get_board_info, get_board_items_page (includeColumns: true), and list_automations, and compare with the proposal:

- **Group order:** if a terminal group (e.g. "Done") is on top, new items land there. Move the first stage to the top with all_monday_api: update_group(board_id, group_id, group_attribute: relative_position_before, new_value: "<current top group id>") { id }.
- **Columns:** add a missing or wrongly typed key field with create_column. Do not rebuild the board.
- **Items:** create missing starter items in one create_items call; fill blank values in one update_items call. Check column value formats with get_column_type_info when unsure. Assign items to the user only if they agreed.
- **Unrequested automations:** create_board can add automations nobody asked for (e.g. AI rules that use AI credits). Mention them in one line and offer to turn them off.

If a write fails after a successful read, retry once, then stop and ask the user to reconnect the connector.

**Show the real board right away** with show-table and the new boardId (no filters), before the dashboard and automation steps. Add one line with the board URL from the tool response. If the board differs from the preview in a noticeable way, say so. If show-table is unavailable, share the URL and continue.

## Step 6: Offer a dashboard

Ask once: "Want me to add a dashboard with a few charts so you can see progress at a glance?" No yes, no dashboard.

Propose 2-4 widgets using real column ids from get_board_info (board ids in settings are strings):

| Widget | When | create_widget settings |
|---|---|---|
| Status breakdown - CHART, pie | always (main status column) | {"graph_type": "pie", "x_axis_columns": {"<board_id>": ["<status_col>"]}, "y_axis_columns": {"<board_id>": ["default-label-count"]}, "x_axis_group_by": "color", "y_axis_group_by": "default-label-count"} |
| Progress - BATTERY | status has a done label | {"done_text": "<exact done label>", "battery_data": {"status_column_ids_per_board": {"<board_id>": ["<status_col>"]}}} |
| Second breakdown - CHART, column | Priority / Stage column | as the pie, with "graph_type": "column" |
| Total - NUMBER | a numbers column | {"counter_data": {"calculation_type": "columns", "column_ids_per_board": {"<board_id>": ["<numbers_col>"]}, "counter_type": "sum"}, "number_format": "number"} |

For any other widget, call all_widgets_schema first. If show-chart / show-battery are available, preview the widgets from the current item counts per label (colors from the label hex values) and ask "build it?"; otherwise describe them in a short list.

After a yes: create_dashboard (name, workspace_id, board_ids: ["<board_id>"]), then create_widget per widget with parent_container_type "DASHBOARD" and the new dashboard id. Retry a failed widget once, then skip it and say which. If dashboards are not on the user's plan, say so and continue. Share the dashboard link: https://<account>.monday.com/overviews/<dashboard_id>.

## Step 7: Add the starter automation

1. Call create_automation with the boardId and a Trigger / Conditions / Actions description using the real column and group names. If it returns needs_clarification, ask and call again.
2. **Read it back** with list_automations: a "status changes to X" trigger must not also require the previous status to be X, and conditions must not be inverted. If wrong, deactivate it with manage_automations and recreate it.
3. If automations are not on the user's plan or trial, mention it and continue.

## Step 8: Hand over with a first win

1. Summarize in a few lines: what was built, the dashboard and automation if created, the board URL. Do not list the items again.
2. Give one thing to try now, using one of their items: "Try it: say **mark Finalize messaging as done**." When they do, make the change and show the board again with show-table.

Then offer the habits that bring people back: "Any time, ask me **what's overdue** or **give me a status update**", and, if it is for a team, "Want me to invite your teammates?" Stop there.

## Starter automations

| Board type | Starter automation |
|---|---|
| Projects / tasks | When Status changes to Done, move the item to the Done group |
| Clients / deals | When Stage changes to Closed Won, move the item to the Closed Won group |
| Content | When the publish date arrives, notify the author |
| Requests / intake | When an item is created, notify the assignee |
| Bugs / issues | When Severity changes to Critical, notify the assignee |
| Anything else | When Status changes to Stuck, notify the owner |
`;

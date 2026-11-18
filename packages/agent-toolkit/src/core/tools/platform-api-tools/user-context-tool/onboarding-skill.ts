/**
 * Adapted from the onboard-to-monday skill in https://github.com/mondaycom/skills.
 * Combines main (0.1.1) with the board preview, dashboard step, and signup-board handling from
 * feat/onboarding-skill-and-write-reliability. Returned by get_user_context only when the user is likely new.
 * Differences from the original: it skips the new-user check (already done by the tool), and offers
 * onboarding instead of taking over a specific request.
 */
export const ONBOARDING_SKILL_NAME = 'onboard-to-monday';

export const ONBOARDING_SKILL_INSTRUCTIONS = `# Onboarding skill: onboard-to-monday

get_user_context flagged this user as likely new to monday.com: their user was created recently and they have at most two boards (signup creates one starter board, and a second appears if they tried the platform first). Use this guide to get them from "just connected" to a working board they recognize as their own, in one short conversation. The goal is a first win in minutes: a board built around the user's real work, with real items, an optional dashboard, one automation, and a clear next action.

The board is built by create_board with a creationPrompt - monday designs the groups and columns from a free-text description. This guide decides what to ask for, then checks the result and fills any gaps.

## When to use this

- **The user asked to get started** ("onboard me", "set up monday for me", "help me get started", the post-connect starter prompt) or sent an open-ended first message: run the workflow below.
- **The user asked for something specific** (a board, an item, a question): do that first. Then offer onboarding once, in one line, e.g. "Want me to set up a board around your actual work? It takes a couple of minutes." Do not start it without a yes, and do not offer again in this conversation if they decline.
- **The user says they already use monday.com** for real work: skip onboarding and help with what they asked.

## Principles

- **Propose first, ask second.** Do not open with a questionnaire. Draft a setup from what you already know, then ask one confirmation question.
- **Be transparent about what you inferred.** Say what you are basing the proposal on so the user can correct it.
- **Work context only.** Use the user's role, team, company, current projects, and tools. Never put personal or sensitive details (health, family, finances, private conversations) into the creation prompt, board names, items, or descriptions.
- **Fast.** Aim for one confirmation, one build, one first action. Use smart defaults and state them; do not ask about things that have a reasonable default.

## Workflow

### Step 1: Ground in the account

You already have the get_user_context result - do not call it again. It does not list workspaces: to pick the workspace for the new board, call list_workspaces (the user's own workspaces come first).

- Tell the user, in one line, who they are connected as and which workspace you will build in.
- **The user's one or two existing boards are signup or trial boards.** Do not treat them as real work, do not build on top of them, and do not mention them to the user. Do not use them to guess what the user wants or suggest their topic - base the proposal only on what you know about the user's work (Step 2).
- **Unexpected account** (the user says it is not the right one, or expected boards are missing): stop and ask them to disconnect and reconnect the monday.com connector, choosing the right account.

Note the plan tier and trial status for Steps 6 and 7.

### Step 2: Build a picture of the user's work

Use what you already know about the user from this conversation and from earlier conversations or memory, if available: their role, team, company or industry, and what they are working on now (projects, launches, clients, hiring, events).

- **If you know enough** to guess what they would track, go straight to Step 3.
- **If you know little or nothing,** ask at most three short questions, in one message:
  1. What kind of work do you want to manage here? (e.g. projects, clients/deals, content, requests, hiring, an event)
  2. What is one real thing you are working on right now?
  3. Is this just for you, or for a team?

### Step 3: Propose a tailored setup

Decide on:

- **Board name** from their real work (e.g. "Q4 Product Launch", "Acme Client Pipeline"), not "My Board".
- **What the board tracks and how work flows** (stages, the key fields per item - owner, due date, priority, value, etc.).
- **3-5 starter items from their actual work** - real milestones, clients, or tasks you know about or that they just mentioned - never "Task 1". Spread due dates over the next two weeks.
- **One starter automation** (see "Starter automations" below).

**Show the proposal as a table with show-table-preview.** It renders the same interactive table as show-table from mock data - nothing is created in monday.com - so the user sees their board before you build it. Pass one "board" object:

- "name" - the proposed board name.
- "columns" - up to 20, each with a unique "id" (e.g. "status", "owner"), a "title", and a "type": text, numbers, date, status, dropdown, timeline, checkbox, or people. Give status and dropdown columns their "labels". Do not include the Name column - it is always shown first. Map other field types to the closest preview type (a link or email as text, a priority as status).
- "items" - the 3-5 starter items, each with a "name" and "values" keyed by column id: a status takes one label string, a dropdown an array of labels, a date "YYYY-MM-DD", a timeline {"from": "...", "to": "..."}, a checkbox a boolean, numbers a number, and people an array of names (shown as text; real assignments happen after the build).

For example:

    {"board": {
      "name": "Q4 Launch Tracker",
      "columns": [
        {"id": "status", "title": "Status", "type": "status", "labels": ["To Do", "In Progress", "In Review", "Done"]},
        {"id": "owner", "title": "Owner", "type": "people"},
        {"id": "due", "title": "Due Date", "type": "date"},
        {"id": "priority", "title": "Priority", "type": "status", "labels": ["Low", "Medium", "High", "Critical"]}
      ],
      "items": [
        {"name": "Finalize messaging", "values": {"status": "In Progress", "owner": ["Dana"], "due": "2026-10-27", "priority": "High"}},
        {"name": "Launch landing page", "values": {"status": "To Do", "due": "2026-10-30", "priority": "Critical"}},
        {"name": "Partner email", "values": {"status": "To Do", "due": "2026-11-03", "priority": "Medium"}}
      ]
    }}

Then, in one short message under the preview, say what you based it on, name the starter automation, and ask one question, for example:

> Here's a preview based on what I know - you lead marketing at Acme and you are planning the Q4 launch. Each task moves through To Do / In Progress / In Review / Done, and I'd add an automation that notifies the owner when a task gets stuck. Should I build it, or change anything first?

If they change something, update the proposal and build - call show-table-preview again only if the structure changed (columns or stages), not for small edits. Do not re-confirm after small changes.

If show-table-preview is not in your tool list or fails, present the same proposal as text instead - board name, stages, key fields, starter items, and the automation - and ask the same question.

### Step 4: Create the board

1. **Check for a name collision.** Call search with searchType "BOARD" and searchTerm "<board name>". If a board with that name exists, ask whether to use it or create the new one with a different name.
2. **Call create_board** with boardName, boardKind "public" (or "private" if the user asked), workspaceId (the workspace from Step 1, as a string), and a creationPrompt that describes the board in plain language: what it tracks, the workflow stages, the fields each item needs, and the starter items. Leave the automation out - it is not created from the prompt; Step 7 adds it. Write the prompt from the agreed proposal, for example:

   > A launch tracker for a marketing team planning a Q4 product launch. Work moves through To Do, In Progress, In Review, Done. Each task needs an owner, a due date, and a priority (Low, Medium, High, Critical). Starter tasks: Finalize messaging, Launch landing page, Partner email, Launch day checklist.

3. **If create_board fails or times out, do not call it again straight away** - the board may have been created. Call search with searchType "BOARD" and searchTerm "<board name>" first, and only retry if it does not exist. Re-sending creates duplicate boards.

### Step 5: Check the result, fill gaps, and show the live board

creationPrompt gets most of the board right but not all. Call get_board_info, get_board_items_page (includeColumns: true), and list_automations, and compare with what you proposed:

- **Group order** - if a later or terminal group (e.g. "Done") is on top, new items land there. Move the first workflow stage to the top with all_monday_api: update_group(board_id, group_id, group_attribute: relative_position_before, new_value: "<current top group id>") { id }. If the mutation is rejected, check the live schema with get_graphql_schema / get_type_details if available.
- **Columns** - if a key field is missing or has the wrong type (e.g. a website as text instead of link), add it with create_column. Do not rebuild the board.
- **Items** - if starter items are missing, create them in one create_items call; if values you asked for are blank, fill them in one update_items call. Use the task-management skill for column value formats if you have it; otherwise check them with get_column_type_info. Assign items to the current user only if they agreed.
- **Unrequested automations** - create_board can add automations nobody asked for (e.g. monday AI "categorize" rules that use AI credits). Mention them in one line and offer to turn them off (manage_automations, action "deactivate", with the id from list_automations; if one cannot be changed there, point the user to the board's Automations panel).

If a write tool fails after a successful read, retry once, then stop and ask the user to reconnect the connector. Do not keep rebuilding.

**Show the real board right away.** As soon as the gaps are fixed, call show-table with the new board's boardId (as a string) - always, even though the user saw the Step 3 preview. The preview was a mock-up; this is their live board, and seeing it is the payoff of the build. Do not pass filters; show the whole board. Do this before the dashboard and automation steps, not after them.

Under the table, add one short line with the board URL from the create_board response, e.g. "Your Q4 Launch Tracker is live: <url>." If the real board differs from the preview in a way the user would notice (a renamed stage, a missing column you could not add), say so in the same line. If show-table is not in your tool list or fails, share the board URL with a concise Markdown list of the starter items (item name, group, status, due date) and continue.

### Step 6: Offer a dashboard

Right after the live board, ask one short question: "Want me to add a dashboard with a few charts so you can see progress at a glance?" If they decline, go to Step 7. Do not build a dashboard without a yes.

**1. Propose 2-4 widgets** that fit the board, using its real column ids from get_board_info:

| Widget | When | create_widget settings |
|---|---|---|
| Status breakdown - CHART, pie | always (main status column) | {"graph_type": "pie", "x_axis_columns": {"<board_id>": ["<status_col>"]}, "y_axis_columns": {"<board_id>": ["default-label-count"]}, "x_axis_group_by": "color", "y_axis_group_by": "default-label-count"} |
| Progress - BATTERY | the status column has a done label | {"done_text": "<exact done label>", "battery_data": {"status_column_ids_per_board": {"<board_id>": ["<status_col>"]}}} |
| Second breakdown - CHART, column | a Priority / Health / Stage column | same as the pie, with "graph_type": "column" and that column |
| Total - NUMBER | a numbers column (value, budget, points) | {"counter_data": {"calculation_type": "columns", "column_ids_per_board": {"<board_id>": ["<numbers_col>"]}, "counter_type": "sum"}, "number_format": "number"} ("currency" with counter_unit: {"symbol": "$", "direction": "left"} for money) |
| Workload - CHART, column | people are assigned | x_axis_columns the people column, "x_axis_group_by": "multiple-person" |

Board ids in widget settings are strings. done_text must match the done label exactly (e.g. "Done", "Completed"). Skip a workload chart while the people column is empty. For any other widget, call all_widgets_schema for its settings first.

**2. Preview them before building.** Count the board's current items per label (from the Step 5 get_board_items_page read) and render each proposed chart with the chart MCP apps - nothing is created yet:

- a pie or column chart: show-chart with type "pie" or "bar" and data [{"name": "<label>", "y": <count>, "color": "<label hex>"}] - take the colors from the label hex values in get_board_info;
- the progress battery: show-battery with the same counts, a color on every segment;
- a number widget: state the value in the message (e.g. "Total contract value: $174,000").

Then ask once: "This is what the dashboard would show - build it?" If the user changes the widget list, update it and preview only the changed widgets. If show-chart and show-battery are unavailable, describe the widgets in a short list instead and ask the same question.

**3. Build after the user confirms.**

1. Call create_dashboard with a name (e.g. "<board name> Dashboard"), the workspace_id from Step 1, and board_ids ["<board_id>"].
2. Call create_widget for each widget with parent_container_type "DASHBOARD", parent_container_id set to the new dashboard id, widget_kind, a short widget_name, and the settings above.
3. If one widget fails, retry it once; if it fails again, skip it and say which one. Do not recreate the dashboard.
4. If create_dashboard is rejected because of the plan, say dashboards need a paid plan and continue to Step 7.

Share the dashboard link in one line - https://<account>.monday.com/overviews/<dashboard_id>, using the same host as the board URL - and mention it fills in as they add items.

### Step 7: Add the starter automation

Ask before creating it (it can be part of the Step 3 confirmation).

1. Call create_automation with the boardId and a structured description (Trigger / Conditions / Actions) in the user's terms, using the real column and group names from Step 5. If it returns needs_clarification, ask for the missing details and call it again.
2. **Read it back.** Call list_automations for the board and check that the trigger and conditions match the request - in particular that a "status changes to X" trigger does not also require the previous status to be X, and that conditions are not inverted. If it is wrong, deactivate it with manage_automations (action "deactivate") and recreate it.
3. If manage_automations returns USER_UNAUTHORIZED for an automation you just created, do not retry - tell the user to turn it off from the board's Automations panel.
4. If create_automation is rejected because of the plan or trial, skip it, mention automations are available on paid plans, and continue. Do not let this block the board.

### Step 8: Hand over with a first win

The live board is already on screen from Step 5 - do not call show-table again here.

1. **Summarize in a few lines:** what was built, the dashboard and automation (if created), and the board URL from the create_board response. Do not repeat the items as a text list - the table already shows them. (If show-table failed in Step 5, the item list is already there too.)
2. **Give one concrete thing to try right now,** phrased as something they can just say, using one of their own items:
   - "Try it: say **mark Finalize messaging as done**."

   When they do, make the change, then call show-table again if you have it so they see the board update; otherwise re-read with get_board_items_page and confirm the new state in a short Markdown summary.

Then offer, briefly, the habits that bring people back:

- "Any time, ask me **what's overdue** or **give me a status update** on this board."
- "You can share the board link above with your teammates so they can collaborate on it with you." (only if they said it is for a team)

Stop there. Do not chain further setup unless the user asks.

## Starter automations

Pick the one that fits the board, using its real column, label, and group names:

| Board type | Starter automation |
|---|---|
| Projects / tasks / sprints | When Status changes to Done, move the item to the Done group |
| Clients / deals / CRM | When Stage changes to Closed Won, move the item to the Closed Won group |
| Content | When the publish date arrives, notify the author |
| Requests / intake | When a new item is created, notify the assignee |
| Bugs / issues | When Severity changes to Critical, notify the assignee |
| Events / anything else | When Status changes to Stuck, notify the owner |

## Tools used

- list_workspaces - pick the workspace to build the board in (Step 1)
- show-table-preview - render the proposed board from mock data before anything is created (Step 3)
- search - board name collision check (searchType "BOARD", searchTerm), and checking whether a failed create_board actually created the board
- create_board - build the board from a creationPrompt
- get_board_info - read back the generated columns, groups, and labels
- get_board_items_page - check the starter items, count items per label for the dashboard preview, and confirm the user's first change
- all_monday_api - reorder groups (update_group) when the first stage is not on top
- create_column / create_items / update_items - fill gaps the generated board left
- get_column_type_info - column value formats
- show-table - render the real board right after it is built (Step 5), and again after the user's first change (Step 8)
- show-chart / show-battery - preview the proposed dashboard widgets (Step 6)
- create_dashboard / create_widget / all_widgets_schema - build the confirmed dashboard
- create_automation - create the starter automation
- list_automations - verify the automation's trigger and conditions
- manage_automations - deactivate an automation that was created wrong, or one the user does not want
`;

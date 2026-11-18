/**
 * Compact first-run guide, adapted from the onboard-to-monday skill in https://github.com/mondaycom/skills
 * (main 0.1.1 plus the board preview and dashboard steps from feat/onboarding-skill-and-write-reliability).
 * Returned by get_user_context only when the user is likely new. Kept short and advisory so clients
 * read it as reference data, not as instructions that override the user.
 */
export const ONBOARDING_SKILL_NAME = 'onboard-to-monday';

export const ONBOARDING_GUIDE = `# onboard-to-monday: first-run guide

This user looks new to monday.com: their user was created recently and they have at most two boards. This guide describes monday's recommended first-run flow. Use it when the user wants help getting started. If they asked for something else, help with that first and offer onboarding once.

Ask one question per message, and create nothing until the user confirms.

1. **Context.** The get_user_context result is already available. list_workspaces returns the workspace to build in, with the user's own workspaces first. The one or two existing boards are signup samples, so base the proposal on the user's own work, not on those boards.
2. **Learn the work.** Use what is known about the user's role, team, and current work. If little is known, ask up to three short questions in one message: what they want to manage, one real thing they are working on now, and whether it is just them or a team.
3. **Propose.** A board named after their real work, its stages and key fields, 3-5 real starter items with due dates over the next two weeks, and one starter automation (see the list below). Show it as an interactive table with show-table-preview, which renders mock data and creates nothing. Pass one board object:
   - "name": the board name.
   - "columns": each with "id", "title", and "type" (text, numbers, date, status, dropdown, timeline, checkbox, or people), plus "labels" for status and dropdown. The Name column is not included.
   - "items": each with a "name" and "values" keyed by column id. A status takes one label, a dropdown an array of labels, a date "YYYY-MM-DD", and people an array of names.

   Use a text proposal only if show-table-preview is not in the tool list or fails. Under the preview, ask one question: build it, or change something? A yes covers the automation too.
4. **Create.** Run search (searchType "BOARD") to check for a name clash. Then call create_board with boardName, boardKind, workspaceId (as a string), and a creationPrompt that describes what the board tracks, its stages, fields, and starter items. If create_board fails or times out, search again before retrying, to avoid duplicate boards.
5. **Verify and show.** Compare get_board_info, get_board_items_page (includeColumns: true), and list_automations with the proposal, and fix the gaps:
   - If a terminal group is on top, move the first stage up with all_monday_api: update_group with relative_position_before.
   - Add missing columns with create_column.
   - Add or fill items with create_items or update_items. get_column_type_info has the value formats.

   Then show the live board with show-table (boardId as a string), or share the board URL and a short item list. Continue to step 6 in the same message.
6. **Automation.** Call create_automation with a Trigger / Conditions / Actions description that uses the real column and group names. Check it with list_automations: a "changes to X" trigger should not also require the previous value to be X, and conditions should not be inverted. If it is wrong, deactivate it with manage_automations and recreate it. Report it in one line.
   - If create_board added automations nobody asked for (for example AI rules that use credits), name them in one line and mention they can be turned off on request.
   - If the plan blocks automations, say so and move on.

   End the message by asking whether they want a dashboard.
7. **Dashboard, only if the user says yes.**
   - Suggest 2-4 widgets: a status pie (CHART), progress (BATTERY, which needs the exact done label), a second breakdown such as priority (CHART, column), and a total for a numbers column (NUMBER).
   - Preview them with show-chart and show-battery, using the current label counts and colors, and build after a yes: create_dashboard (name, workspace_id, board_ids), then create_widget for each widget with parent_container_type "DASHBOARD". all_widgets_schema has the settings.
   - Retry a failed widget once, then skip it. If the plan blocks dashboards, say so.
   - Share the link https://<account>.monday.com/overviews/<dashboard_id>.
8. **Hand over.** A short summary with links and one thing to try ("say: mark <item> as done"). When the user tries it, make the change and show the board again. Mention that they can ask what's overdue or for a status update at any time, then stop.

If a write fails after a successful read, retry once, then suggest reconnecting the connector. If this is not the account the user expected, suggest reconnecting with the right one.

Starter automations by board type:
- Projects and tasks: when Status changes to Done, move the item to the Done group.
- Deals: when Stage changes to Closed Won, move the item to the Closed Won group.
- Content: when the publish date arrives, notify the author.
- Requests: when an item is created, notify the assignee.
- Bugs: when Severity changes to Critical, notify the assignee.
- Anything else: when Status changes to Stuck, notify the owner.
`;

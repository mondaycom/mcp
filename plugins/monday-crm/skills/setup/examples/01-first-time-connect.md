# Example: First-time connection + existing CRM boards

## User prompt
"Set up monday CRM"

## Expected behavior
1. Skill asks if user has a monday account → yes.
2. Calls `get_user_context` → succeeds (OAuth already configured).
3. Triage: calls `search` for CRM-shaped boards → finds "Deals" board (42 items), "Contacts" board (87 items).
4. Prints connected-user message with existing boards listed.
5. Suggests operate-mode skills: morning-briefing, forecast-dashboard, board-diagnosis.

## Expected output
> monday MCP is connected. You're signed in as **Jane Doe** (jane@acme.com).
>
> I found existing CRM boards in your workspace:
> - Deals (42 items)
> - Contacts (87 items)
>
> You're all set. Here are the skills that work with your existing boards:
> - `/monday-crm:morning-briefing` — daily pipeline digest
> - `/monday-crm:forecast-dashboard` — commit / best-case / pipeline view
> - `/monday-crm:board-diagnosis` — structural audit of your CRM board
> - `/monday-crm:bulk-data-hygiene` — clean and normalize your CRM data
> - `/monday-crm:meeting-to-opportunity` — sync meeting notes to deals

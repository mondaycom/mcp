# Example 2 — Step 0 failure: NoteTaker not connected

Shows: skill invoked, connector check passes, NoteTaker probe returns auth/permission error, skill stops gracefully with setup instructions.

---

**User:**
> log this meeting — just had a call with Arcadia Systems

**Claude (step 0 — connector check):**
*[calls `mcp__monday__get_user_context` → `user: { id: 912044, name: "Sarah Levi", email: "sarah@monday.com" }` — OK]*
*[internal_domain = "monday.com"]*
*[calls `mcp__monday__get_notetaker_meetings({ limit: 1 })` → error: `{ "error": "NoteTaker not enabled for this account" }`]*

> NoteTaker isn't connected for this account, or you don't have meetings recorded yet. Set up NoteTaker at the monday.com app (monday NoteTaker), then re-run `/monday-crm:meeting-to-opportunity`.
>
> If you'd like to log notes manually instead, try `/monday-crm:meeting-to-opportunity` after pasting a transcript, or update the Arcadia Systems deal directly on your Deals board.

**[Skill stops. No further steps run.]**

---

## What this example demonstrates

- Step 0 runs the connector check first, then the NoteTaker probe.
- `internal_domain` is still extracted before NoteTaker fails (it's derived from `get_user_context`, which succeeded).
- On NoteTaker auth/permission error, the skill prints a clear setup message and halts immediately — no partial state, no empty sync docs.
- The user trigger "log this meeting" / "just had a call with [company]" correctly routes to this skill before hitting the failure.
- Graceful stop does not leave the user confused about what to do next — offers an alternative path.

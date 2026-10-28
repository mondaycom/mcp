# Tool error messages carry our own GraphQL document back to the model

> **Method:** use the `investigate-tool-errors` skill. Index: [README.md](README.md).

Investigated 2026-09-06.

## The problem

Every tool that lets a raw `graphql-request` error reach `formatToolError` returns ~1.9KB of text
to the model, most of it the GraphQL query we just sent.

The library builds the message itself, in `node_modules/graphql-request/build/cjs/types.js`:

```js
class ClientError extends Error {
  constructor(response, request) {
    const message = `${ClientError.extractMessage(response)}: ${JSON.stringify({
      response,
      request,
    })}`;
```

So `error.message` is `<real message>: <JSON of response AND request>`, and `request` holds the
query document plus variables. dapulse only ever sent the short part, e.g. "Column not found".

## Verified, not assumed

Running a real `ClientError` through the toolkit's own `formatToolError`:

- `content[0].text` — **1,946 chars**, and contains `fragment ItemDataFragment` (our query)
- `structuredContent.errors[0]` — **clean**: `{ message, path, code, status_code, error_data }`
- `structuredContent.message` — **the full dump**, because `buildToolErrorStructuredContent` sets
  `message: rawMessage`

For `get_board_items_page` the query document alone is 1,413 chars.

## Why it matters

- Token cost: ~1.9KB per error, on a tool doing ~2,400 `ResourceNotFoundException` per 2 days.
- Worse recovery: the actionable part (`error_data.column_id`) sits around char 250 of 1,946.
- It leaks our internal query text to the caller.
- It probably breaks our own observability: `log.ts` derives `error_message` from
  `content[0].text`, and that field reads `"Unknown error"` for 38% of this tool's errors and
  1,935 of 3,055 agent-toolkit tool errors in a 2h sample.

## Fix

Strip the `: {json}` tail once, centrally, rather than per tool. `error.response` already carries
everything structured, so the message never needs the serialised copy. Candidates:
`formatToolError` / `buildToolErrorStructuredContent` in `packages/agent-toolkit/src/utils/error.utils.ts`,
or a wrapper around the API client.

Note that tools calling `rethrowWithContext` already avoid this, because that builds a fresh
`Error` from `e.message` plus `extensions` only.

**If the fix is instead to return only `structuredContent` from the MCP server:** that works for
`errors[]`, but `structuredContent.message` still carries the whole dump. Drop or shorten that
field too.

## Code references

- `packages/agent-toolkit/src/utils/error.utils.ts` — `formatToolError`,
  `buildToolErrorStructuredContent` (`message: rawMessage`), `rethrowWithContext`
- `ai-toolbox/packages/mcp/src/server/observability/log.ts:110-111` — reads `content[0].text`,
  should fall back to `structuredContent.message` / `errors[0].message`
- `node_modules/graphql-request/build/cjs/types.js` — `ClientError` constructor

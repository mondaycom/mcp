# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # Build with Rollup (outputs CJS + ESM to dist/)
npm test               # Run all tests with Jest
npx jest path/to/file  # Run a single test file
npm run lint           # ESLint with auto-fix
npm run prettier       # Format with Prettier

# GraphQL codegen pipeline (fetches monday.com schema + generates TS types)
npm run fetch:generate          # Fetch schema + codegen (both default and dev)
npm run fetch:generate default  # Fetch + codegen for default schema only
npm run fetch:generate dev      # Fetch + codegen for dev schema only
npm run fetch:schema            # Fetch schema only
npm run codegen                 # Run codegen only (assumes schema files exist)
```

## Architecture

This is `@mondaydotcomorg/agent-toolkit` — an npm package providing monday.com API tools for AI agents. It exposes three subpath entry points:

- **`/core`** — Base tool interfaces and the tool registry
- **`/mcp`** — MCP (Model Context Protocol) server implementation
- **`/openai`** — OpenAI function-calling integration

### Tool System

All tools implement the `Tool<Input, Output>` interface (defined in `src/core/tool.ts`) which extends `Executable`. Tools have a `name`, `type` (READ/WRITE/ALL_API), `annotations`, and Zod-based input schemas.

There are two base classes for tools:

1. **`BaseMondayApiTool`** (`src/core/tools/platform-api-tools/base-monday-api-tool.ts`) — For tools that use the monday.com GraphQL API via `@mondaydotcomorg/api` client. Constructor receives `(apiClient, apiToken, context)`.

2. **`BaseMondayAppsTool`** (`src/core/tools/monday-apps-tools/base-tool/base-monday-apps-tool.ts`) — For tools that call monday.com Apps Framework REST endpoints via Axios. Constructor receives `(apiToken)`.

Both base classes wrap `executeInternal()` with tracking in their public `execute()` method. **Always implement `executeInternal()`, never override `execute()`.**

### Tool Categories

Tools are organized into three groups (see `src/core/tools/index.ts`):

- **`platform-api-tools/`** — GraphQL-based tools for boards, items, columns, workforms, docs, dashboards, search, etc. Registered via `allGraphqlApiTools`.
- **`monday-apps-tools/`** — REST-based tools for app management, features, versions, deployment, and storage. Registered via `allMondayAppsTools`.
- **`monday-dev-tools/`** — Sprint/development workflow tools. Registered via `allMondayDevTools`.

### Adding a New Platform API Tool

1. Create a directory under `src/core/tools/platform-api-tools/your-tool-name/`
2. Add GraphQL operations in `.graphql.ts` files using `gql` from `graphql-request`, then run `npm run codegen` to generate TS types
3. Define Zod input schema as a const object — every field needs `.describe()` for MCP tool documentation
4. Create a class extending `BaseMondayApiTool<typeof yourToolSchema>`
5. Set `name` (snake_case), `type`, and `annotations` via `createMondayApiAnnotations()` (sets `openWorldHint: true`). Annotation fields: `title`, `readOnlyHint` (true for READ), `destructiveHint` (true if deletes data), `idempotentHint` (true if repeated calls are safe)
6. Implement `getDescription()`, `getInputSchema()`, and `executeInternal()`
7. Register in `src/core/tools/platform-api-tools/index.ts` — add import, add to `allGraphqlApiTools` array, and add `export *`
8. Add tests as `.test.ts` files co-located with the tool; use `createMockApiClient()` from `test-utils/`

For detailed guidance with code examples, run `/mcp-tool` or see `../../.claude/commands/mcp-tool.md`.

### Tool Filtering & Modes

`ToolsConfiguration` (in `src/core/monday-agent-toolkit.ts`) controls which tools are available:

- **`mode`**: `'api'` (default — platform + dev tools), `'apps'` (apps framework tools only)
- **`include`/`exclude`**: Filter by tool name
- **`readOnlyMode`**: Only include tools with `type: ToolType.READ`
- **`enableDynamicApiTools`**: Controls `ALL_API` type tools (`true`/`false`/`'only'`)

### GraphQL Codegen

- Schema files: `src/monday-graphql/schema.graphql` (default) and `schema.dev.graphql` (dev)
- The API version used for fetching schemas comes from `src/utils/version.utils.ts`
- GraphQL operations in `*.graphql.ts` files generate types into `src/monday-graphql/generated/graphql/`
- Dev operations in `*.graphql.dev.ts` generate into `src/monday-graphql/generated/graphql.dev/`
- Config: `codegen.yml`

### Build Output

Rollup builds each subpath (`mcp`, `core`, `openai`) into both CJS and ESM formats with TypeScript declarations. External deps (`@mondaydotcomorg/api`, `zod`, `zod-to-json-schema`) are not bundled.

### Updating Existing Tools

When modifying an existing tool's behavior, review and update `getDescription()` to reflect the new capabilities. The description is what LLMs see when selecting tools — stale descriptions lead to incorrect tool usage.

### Version Bumping

**The package version must be manually bumped** in `package.json` before publishing — there is no automatic versioning. Document changes in `CHANGELOG.md`.

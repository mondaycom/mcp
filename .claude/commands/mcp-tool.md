# Developing monday.com API Tools (Agent Toolkit)

Guide for developing monday.com platform API tools in the agent-toolkit package. Use when creating, modifying, or debugging tools in packages/agent-toolkit/src/core/tools/platform-api-tools/, working with GraphQL queries, or adding new MCP tools to the toolkit.

## Package Location

`packages/agent-toolkit` — published as `@mondaydotcomorg/agent-toolkit`.

## Architecture Overview

All platform API tools live under `src/core/tools/platform-api-tools/`. Each tool extends `BaseMondayApiTool<InputSchema, Output>` from `base-monday-api-tool.ts`, which itself implements the `Tool` interface from `src/core/tool.ts`.

### Tool interface

```typescript
// From src/core/tool.ts
interface Tool<Input, Output> {
  name: string;             // snake_case identifier (e.g. "create_update")
  type: ToolType;           // READ, WRITE, or ALL_API
  annotations: ToolAnnotations; // MCP annotations
  enabledByDefault?: boolean;
  getDescription(): string;
  getInputSchema(): Input;
}
```

### BaseMondayApiTool

```typescript
abstract class BaseMondayApiTool<Input, Output> {
  constructor(mondayApi: ApiClient, apiToken?: string, context?: MondayApiToolContext);
  abstract name: string;
  abstract type: ToolType;
  abstract annotations: ToolAnnotations;
  abstract getDescription(): string;
  abstract getInputSchema(): Input;
  protected abstract executeInternal(input): Promise<ToolOutputType<Output>>;
}
```

The public `execute()` method wraps `executeInternal()` with tracking. Always implement `executeInternal()`, never override `execute()`.

## Creating a New Tool

### 1. File structure

Simple tools can be a single file. Tools with GraphQL operations, tests, or helpers should use a folder:

```
tool-name/
├── tool-name.ts              # Tool class
├── tool-name.graphql.ts      # GraphQL query/mutation
├── tool-name.test.ts         # Tests
└── tool-name.utils.ts        # Helpers
```

### 2. Define GraphQL operations

Create a `.graphql.ts` file using `gql` from `graphql-request`:

```typescript
import { gql } from 'graphql-request';

export const myOperation = gql`
  mutation myMutation($id: ID!, $value: String!) {
    my_mutation(id: $id, value: $value) {
      id
    }
  }
`;
```

### 3. Run codegen (CRITICAL)

**After any change to `.graphql.ts` files, you MUST run codegen** to regenerate TypeScript types:

```bash
cd packages/agent-toolkit

# Fetch latest schema + run codegen (recommended)
npm run fetch:generate

# Or run codegen only (if schema hasn't changed)
npm run codegen
```

This generates typed operations in `src/monday-graphql/generated/graphql/` (default) and `src/monday-graphql/generated/graphql.dev/` (dev).

- `codegen.yml` controls which files are picked up — default project uses `src/**/*.graphql.ts` excluding `*.graphql.dev.ts`.
- The dev project uses only `src/**/*.graphql.dev.ts`.
- Schema is fetched from monday.com API based on the `API_VERSION` in `src/utils/version.utils.ts`.

### 4. Define the Zod input schema

Use Zod to define inputs. Each field needs a `.describe()` for MCP tool documentation:

```typescript
import { z } from 'zod';

export const myToolSchema = {
  itemId: z.number().describe('The id of the item'),
  value: z.string().describe('The value to set'),
};
```

### 5. Implement the tool class

```typescript
import { ToolType, ToolInputType, ToolOutputType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { MyMutation, MyMutationVariables } from '../../../../monday-graphql/generated/graphql/graphql';
import { myOperation } from './my-tool.graphql';

export const myToolSchema = { /* ... */ };

export class MyTool extends BaseMondayApiTool<typeof myToolSchema> {
  name = 'my_tool';
  type = ToolType.WRITE; // or READ, ALL_API
  annotations = createMondayApiAnnotations({
    title: 'My Tool',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Description shown to LLMs when selecting tools.';
  }

  getInputSchema(): typeof myToolSchema {
    return myToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof myToolSchema>
  ): Promise<ToolOutputType<never>> {
    const variables: MyMutationVariables = {
      itemId: input.itemId.toString(),
      value: input.value,
    };

    const res = await this.mondayApi.request<MyMutation>(myOperation, variables);

    return {
      content: `Operation succeeded: ${JSON.stringify(res)}`,
    };
  }
}
```

### 6. Register the tool

In `src/core/tools/platform-api-tools/index.ts`:

1. Import the tool class.
2. Add it to the `allGraphqlApiTools` array.
3. Add a re-export (`export * from './my-tool'`).

### 7. ToolType and annotations

| ToolType | Use case |
|----------|----------|
| `READ` | Fetches data without side effects |
| `WRITE` | Creates, updates, or deletes data |
| `ALL_API` | Dynamic tools that accept raw GraphQL |

Annotations use `createMondayApiAnnotations()` which sets `openWorldHint: true` by default. Key fields:

- `title` — human-readable name
- `readOnlyHint` — `true` for READ tools
- `destructiveHint` — `true` if the operation deletes data
- `idempotentHint` — `true` if repeated calls produce the same result

## GraphQL Codegen Pipeline

| Command | What it does |
|---------|-------------|
| `npm run fetch:schema` | Downloads `.graphql` schemas from monday.com API |
| `npm run codegen` | Runs `graphql-codegen` to generate TS types from `.graphql.ts` files |
| `npm run fetch:generate` | Both of the above in sequence |

Config files: `codegen.yml`, `graphql.config.yml`, `fetch-schema.sh`, `codegen.sh`.

The API version used for schema fetching is defined in `src/utils/version.utils.ts`.

## Updating Existing Tools

When modifying an existing tool's behavior, review and update `getDescription()` to reflect the new capabilities. The description is what LLMs see when selecting tools — stale descriptions lead to incorrect tool usage. Also update `annotations` if the tool's read/write/destructive characteristics changed.

## Version Bumping

**The package version must be manually bumped** in `packages/agent-toolkit/package.json` before publishing. There is no automatic versioning — update the `"version"` field directly.

## Tool Discovery and Filtering

Tools are instantiated and filtered in `src/utils/tools/`:

- `initializing.utils.ts` — `toolFactory()` instantiates tools based on their base class.
- `tools-filtering.utils.ts` — `getFilteredToolInstances()` filters by `include`/`exclude` lists, `readOnlyMode`, and `enableDynamicApiTools`.

Both `src/mcp/toolkit.ts` and `src/openai/toolkit.ts` use this pipeline to expose tools to their respective runtimes.

## Testing

Tests use Jest (`jest -c`). Place test files next to their tool as `tool-name.test.ts`.

```bash
cd packages/agent-toolkit
npm test                    # Run all tests
npx jest path/to/file       # Run a single test file
```

## Quick Checklist for New Tools

- [ ] Create `.graphql.ts` with GQL operation
- [ ] Run `npm run codegen` (or `fetch:generate`) to generate types
- [ ] Define Zod input schema with `.describe()` on every field
- [ ] Implement tool class extending `BaseMondayApiTool`
- [ ] Set correct `ToolType` and `annotations`
- [ ] Register in `platform-api-tools/index.ts` (import, array, re-export)
- [ ] Add tests
- [ ] Bump version in `package.json`
- [ ] Build with `npm run build` to verify

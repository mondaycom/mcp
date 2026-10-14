# Agent Tools Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 new MCP tools to the agent-toolkit that cover the full agents subgraph surface — catalog discovery, trigger management, skill management, agent updates, state management, and knowledge/resource access.

**Architecture:** Each tool lives in its own folder under `src/core/tools/platform-api-tools/agents-tools/`, co-located with a `.graphql.dev.ts` file containing its GraphQL operations. All tools extend `BaseMondayApiTool`, use `versionOverride: 'dev'`, and follow the Zod + `rethrowWithContext` pattern established by the existing agent tools. Tool descriptions encode the catalog-first workflows so agents know which tools to call before acting.

**Tech Stack:** TypeScript, graphql-request (gql tag), Zod, Jest, graphql-codegen (`npm run fetch:generate dev` in `packages/agent-toolkit`)

---

## File Map

**Modify:**
- `src/core/tools/platform-api-tools/agents-tools/shared/agents.graphql.dev.ts` — export `agentFieldsFragment` (currently unexported)
- `src/core/tools/platform-api-tools/agents-tools/index.ts` — add 6 new exports
- `src/core/tools/platform-api-tools/index.ts` — add 6 new imports + registrations

**Create:**
- `src/core/tools/platform-api-tools/agents-tools/get-agent-catalog/get-agent-catalog.graphql.dev.ts`
- `src/core/tools/platform-api-tools/agents-tools/get-agent-catalog/get-agent-catalog-tool.ts`
- `src/core/tools/platform-api-tools/agents-tools/get-agent-catalog/get-agent-catalog-tool.test.ts`
- `src/core/tools/platform-api-tools/agents-tools/manage-agent-triggers/manage-agent-triggers.graphql.dev.ts`
- `src/core/tools/platform-api-tools/agents-tools/manage-agent-triggers/manage-agent-triggers-tool.ts`
- `src/core/tools/platform-api-tools/agents-tools/manage-agent-triggers/manage-agent-triggers-tool.test.ts`
- `src/core/tools/platform-api-tools/agents-tools/manage-agent-skills/manage-agent-skills.graphql.dev.ts`
- `src/core/tools/platform-api-tools/agents-tools/manage-agent-skills/manage-agent-skills-tool.ts`
- `src/core/tools/platform-api-tools/agents-tools/manage-agent-skills/manage-agent-skills-tool.test.ts`
- `src/core/tools/platform-api-tools/agents-tools/update-agent/update-agent.graphql.dev.ts`
- `src/core/tools/platform-api-tools/agents-tools/update-agent/update-agent-tool.ts`
- `src/core/tools/platform-api-tools/agents-tools/update-agent/update-agent-tool.test.ts`
- `src/core/tools/platform-api-tools/agents-tools/manage-agent-state/manage-agent-state.graphql.dev.ts`
- `src/core/tools/platform-api-tools/agents-tools/manage-agent-state/manage-agent-state-tool.ts`
- `src/core/tools/platform-api-tools/agents-tools/manage-agent-state/manage-agent-state-tool.test.ts`
- `src/core/tools/platform-api-tools/agents-tools/manage-agent-knowledge/manage-agent-knowledge.graphql.dev.ts`
- `src/core/tools/platform-api-tools/agents-tools/manage-agent-knowledge/manage-agent-knowledge-tool.ts`
- `src/core/tools/platform-api-tools/agents-tools/manage-agent-knowledge/manage-agent-knowledge-tool.test.ts`

---

## Task 1: Export agentFieldsFragment from shared

The `update_agent` mutation returns a full `Agent` and needs the shared fragment. Currently `agentFieldsFragment` is a local `const` — make it `export const` so the update-agent graphql file can import it.

**Files:**
- Modify: `src/core/tools/platform-api-tools/agents-tools/shared/agents.graphql.dev.ts`

- [ ] **Step 1: Change `const` to `export const` on the fragment**

In `src/core/tools/platform-api-tools/agents-tools/shared/agents.graphql.dev.ts`, change line 3:

```typescript
// Before
const agentFieldsFragment = gql`
// After
export const agentFieldsFragment = gql`
```

- [ ] **Step 2: Verify nothing broke**

```bash
cd packages/agent-toolkit && npx jest src/core/tools/platform-api-tools/agents-tools --passWithNoTests 2>&1 | tail -5
```

Expected: all existing agent tests pass (3 test suites).

- [ ] **Step 3: Commit**

```bash
git add src/core/tools/platform-api-tools/agents-tools/shared/agents.graphql.dev.ts
git commit -m "refactor(agent-toolkit): export agentFieldsFragment for reuse"
```

---

## Task 2: Write all GraphQL operation files

Write all 6 `.graphql.dev.ts` files before running codegen so types are generated in a single pass.

**Files:** All 6 new `*.graphql.dev.ts` files.

- [ ] **Step 1: Create `get-agent-catalog.graphql.dev.ts`**

```typescript
// src/core/tools/platform-api-tools/agents-tools/get-agent-catalog/get-agent-catalog.graphql.dev.ts
import { gql } from 'graphql-request';

export const getAgentTriggersCatalogQuery = gql`
  query getAgentTriggersCatalog($block_reference_ids: [ID!]) {
    agent_triggers_catalog(block_reference_ids: $block_reference_ids) {
      block_reference_id
      name
      description
      field_schemas {
        field_key
        value_schema
      }
      required_fields {
        field_key
        depends_on
        optional
      }
    }
  }
`;

export const getAgentSkillsCatalogQuery = gql`
  query getAgentSkillsCatalog {
    agent_skills_catalog {
      id
      name
      description
    }
  }
`;
```

- [ ] **Step 2: Create `manage-agent-triggers.graphql.dev.ts`**

```typescript
// src/core/tools/platform-api-tools/agents-tools/manage-agent-triggers/manage-agent-triggers.graphql.dev.ts
import { gql } from 'graphql-request';

export const getAgentActiveTriggersQuery = gql`
  query getAgentActiveTriggers($agent_id: ID!) {
    agent_active_triggers(agent_id: $agent_id) {
      node_id
      block_reference_id
      name
      description
      field_summary
    }
  }
`;

export const addTriggerToAgentMutation = gql`
  mutation addTriggerToAgent($agent_id: ID!, $block_reference_id: ID!, $field_values: JSON) {
    add_trigger_to_agent(agent_id: $agent_id, block_reference_id: $block_reference_id, field_values: $field_values) {
      success
    }
  }
`;

export const removeTriggerFromAgentMutation = gql`
  mutation removeTriggerFromAgent($agent_id: ID!, $node_id: ID!) {
    remove_trigger_from_agent(agent_id: $agent_id, node_id: $node_id) {
      success
    }
  }
`;
```

- [ ] **Step 3: Create `manage-agent-skills.graphql.dev.ts`**

```typescript
// src/core/tools/platform-api-tools/agents-tools/manage-agent-skills/manage-agent-skills.graphql.dev.ts
import { gql } from 'graphql-request';

export const addSkillToAgentMutation = gql`
  mutation addSkillToAgent($agent_id: ID!, $skill_id: ID!) {
    add_skill_to_agent(agent_id: $agent_id, skill_id: $skill_id) {
      success
    }
  }
`;

export const removeSkillFromAgentMutation = gql`
  mutation removeSkillFromAgent($agent_id: ID!, $skill_id: ID!) {
    remove_skill_from_agent(agent_id: $agent_id, skill_id: $skill_id) {
      success
    }
  }
`;
```

- [ ] **Step 4: Create `update-agent.graphql.dev.ts`**

```typescript
// src/core/tools/platform-api-tools/agents-tools/update-agent/update-agent.graphql.dev.ts
import { gql } from 'graphql-request';
import { agentFieldsFragment } from '../shared/agents.graphql.dev';

export const updateAgentMutation = gql`
  ${agentFieldsFragment}

  mutation updateAgent($id: ID!, $input: UpdateAgentInput!) {
    update_agent(id: $id, input: $input) {
      ...AgentFields
    }
  }
`;
```

- [ ] **Step 5: Create `manage-agent-state.graphql.dev.ts`**

```typescript
// src/core/tools/platform-api-tools/agents-tools/manage-agent-state/manage-agent-state.graphql.dev.ts
import { gql } from 'graphql-request';

export const activateAgentMutation = gql`
  mutation activateAgent($id: ID!) {
    activate_agent(id: $id) {
      success
    }
  }
`;

export const deactivateAgentMutation = gql`
  mutation deactivateAgent($id: ID!, $inactive_reason: InactiveReason) {
    deactivate_agent(id: $id, inactive_reason: $inactive_reason) {
      success
    }
  }
`;

export const runAgentMutation = gql`
  mutation runAgent($id: ID!) {
    run_agent(id: $id) {
      trigger_uuid
    }
  }
`;
```

- [ ] **Step 6: Create `manage-agent-knowledge.graphql.dev.ts`**

```typescript
// src/core/tools/platform-api-tools/agents-tools/manage-agent-knowledge/manage-agent-knowledge.graphql.dev.ts
import { gql } from 'graphql-request';

export const getAgentKnowledgeQuery = gql`
  query getAgentKnowledge($id: ID!) {
    agent_knowledge(id: $id) {
      resources {
        resource_id
        scope_type
        permission_type
      }
      files {
        id
        file_name
        file_type
      }
    }
  }
`;

export const addAgentResourceAccessMutation = gql`
  mutation addAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!, $permission_type: KnowledgePermission!) {
    add_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type, permission_type: $permission_type) {
      success
    }
  }
`;

export const removeAgentResourceAccessMutation = gql`
  mutation removeAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!) {
    remove_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type) {
      success
    }
  }
`;

export const updateAgentResourceAccessMutation = gql`
  mutation updateAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!, $permission_type: KnowledgePermission!) {
    update_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type, permission_type: $permission_type) {
      success
    }
  }
`;
```

- [ ] **Step 7: Commit all GraphQL files**

```bash
git add src/core/tools/platform-api-tools/agents-tools/
git commit -m "feat(agent-toolkit): add GraphQL operations for 6 new agent tools"
```

---

## Task 3: Run codegen

Generate TypeScript types from the new GraphQL operations.

**Files:** Auto-generated — `src/monday-graphql/generated/graphql.dev/graphql.ts`

- [ ] **Step 1: Run codegen for the dev schema**

```bash
cd packages/agent-toolkit && npm run fetch:generate dev
```

Expected: exits 0, no errors. The file `src/monday-graphql/generated/graphql.dev/graphql.ts` will be updated with new types including `GetAgentTriggersCatalogQuery`, `GetAgentSkillsCatalogQuery`, `GetAgentActiveTriggersQuery`, `GetAgentActiveTriggersQueryVariables`, `AddTriggerToAgentMutation`, `AddTriggerToAgentMutationVariables`, `RemoveTriggerFromAgentMutation`, `RemoveTriggerFromAgentMutationVariables`, `AddSkillToAgentMutation`, `AddSkillToAgentMutationVariables`, `RemoveSkillFromAgentMutation`, `RemoveSkillFromAgentMutationVariables`, `UpdateAgentMutation`, `UpdateAgentMutationVariables`, `ActivateAgentMutation`, `ActivateAgentMutationVariables`, `DeactivateAgentMutation`, `DeactivateAgentMutationVariables`, `RunAgentMutation`, `RunAgentMutationVariables`, `GetAgentKnowledgeQuery`, `GetAgentKnowledgeQueryVariables`, `AddAgentResourceAccessMutation`, `AddAgentResourceAccessMutationVariables`, `RemoveAgentResourceAccessMutation`, `RemoveAgentResourceAccessMutationVariables`, `UpdateAgentResourceAccessMutation`, `UpdateAgentResourceAccessMutationVariables`.

- [ ] **Step 2: Verify types exist**

```bash
grep -c "GetAgentTriggersCatalogQuery\|GetAgentSkillsCatalogQuery\|AddTriggerToAgentMutation\|AddSkillToAgentMutation\|UpdateAgentMutation\|ActivateAgentMutation\|GetAgentKnowledgeQuery\|AddAgentResourceAccessMutation" src/monday-graphql/generated/graphql.dev/graphql.ts
```

Expected: a number greater than 0 for each type (at least 8 matches total).

- [ ] **Step 3: Commit generated types**

```bash
git add src/monday-graphql/generated/graphql.dev/graphql.ts src/monday-graphql/schema.dev.graphql
git commit -m "chore(agent-toolkit): regenerate dev graphql types for new agent operations"
```

---

## Task 4: `get_agent_catalog` tool

**Files:**
- Create: `src/core/tools/platform-api-tools/agents-tools/get-agent-catalog/get-agent-catalog-tool.test.ts`
- Create: `src/core/tools/platform-api-tools/agents-tools/get-agent-catalog/get-agent-catalog-tool.ts`
- Modify: `src/core/tools/platform-api-tools/agents-tools/index.ts`
- Modify: `src/core/tools/platform-api-tools/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/core/tools/platform-api-tools/agents-tools/get-agent-catalog/get-agent-catalog-tool.test.ts
import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import { GetAgentTriggersCatalogQuery, GetAgentSkillsCatalogQuery } from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('GetAgentCatalogTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockTrigger = {
    block_reference_id: 'status-change-ref',
    name: 'Status Change',
    description: 'Fires when a status column changes',
    field_schemas: [{ field_key: 'board_id', value_schema: 'The ID of the board to watch' }],
    required_fields: [{ field_key: 'board_id', depends_on: [], optional: false }],
  };

  const mockSkill = {
    id: 'skill-1',
    name: 'Board Manager',
    description: 'Manages boards and items',
  };

  it('should return triggers catalog when type is triggers', async () => {
    mocks.setResponseOnce({ agent_triggers_catalog: [mockTrigger] } as GetAgentTriggersCatalogQuery);

    const result = await callToolByNameRawAsync('get_agent_catalog', { type: 'triggers' });
    const parsed = parseToolResult(result);

    expect(parsed.count).toBe(1);
    expect(parsed.triggers[0].block_reference_id).toBe('status-change-ref');
  });

  it('should pass versionOverride dev when fetching triggers', async () => {
    mocks.setResponseOnce({ agent_triggers_catalog: [] } as GetAgentTriggersCatalogQuery);

    await callToolByNameRawAsync('get_agent_catalog', { type: 'triggers' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('getAgentTriggersCatalog'),
      expect.objectContaining({ block_reference_ids: undefined }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should pass block_reference_ids when provided', async () => {
    mocks.setResponseOnce({ agent_triggers_catalog: [mockTrigger] } as GetAgentTriggersCatalogQuery);

    await callToolByNameRawAsync('get_agent_catalog', { type: 'triggers', block_reference_ids: ['status-change-ref'] });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      { block_reference_ids: ['status-change-ref'] },
      expect.anything(),
    );
  });

  it('should return skills catalog when type is skills', async () => {
    mocks.setResponseOnce({ agent_skills_catalog: [mockSkill] } as GetAgentSkillsCatalogQuery);

    const result = await callToolByNameRawAsync('get_agent_catalog', { type: 'skills' });
    const parsed = parseToolResult(result);

    expect(parsed.count).toBe(1);
    expect(parsed.skills[0].id).toBe('skill-1');
  });

  it('should pass versionOverride dev when fetching skills', async () => {
    mocks.setResponseOnce({ agent_skills_catalog: [] } as GetAgentSkillsCatalogQuery);

    await callToolByNameRawAsync('get_agent_catalog', { type: 'skills' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('getAgentSkillsCatalog'),
      expect.anything(),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should return empty list with count 0 when no triggers exist', async () => {
    mocks.setResponseOnce({ agent_triggers_catalog: [] } as GetAgentTriggersCatalogQuery);

    const result = await callToolByNameRawAsync('get_agent_catalog', { type: 'triggers' });
    const parsed = parseToolResult(result);

    expect(parsed.count).toBe(0);
    expect(parsed.triggers).toEqual([]);
  });

  it('should propagate errors when fetching triggers catalog', async () => {
    mocks.setError('Unauthorized');

    const result = await callToolByNameRawAsync('get_agent_catalog', { type: 'triggers' });

    expect(result.content[0].text).toContain('Failed to fetch monday platform agent triggers catalog');
  });

  it('should propagate errors when fetching skills catalog', async () => {
    mocks.setError('Unauthorized');

    const result = await callToolByNameRawAsync('get_agent_catalog', { type: 'skills' });

    expect(result.content[0].text).toContain('Failed to fetch monday platform agent skills catalog');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/agent-toolkit && npx jest src/core/tools/platform-api-tools/agents-tools/get-agent-catalog --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `expect(toolNames).toContain('get_agent_catalog')` fails because the tool isn't registered yet.

- [ ] **Step 3: Implement the tool**

```typescript
// src/core/tools/platform-api-tools/agents-tools/get-agent-catalog/get-agent-catalog-tool.ts
import { z } from 'zod';
import {
  GetAgentTriggersCatalogQuery,
  GetAgentTriggersCatalogQueryVariables,
  GetAgentSkillsCatalogQuery,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { getAgentTriggersCatalogQuery, getAgentSkillsCatalogQuery } from './get-agent-catalog.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const getAgentCatalogToolSchema = {
  type: z
    .enum(['triggers', 'skills'])
    .describe(
      'Which catalog to fetch. "triggers" returns available trigger types with block_reference_id, field_schemas, and required_fields — use before calling manage_agent_triggers with action:add. "skills" returns available skills with id — use before calling manage_agent_skills.',
    ),
  block_reference_ids: z
    .array(z.string())
    .optional()
    .describe(
      'Only applies when type is "triggers". Fetch specific entries by block_reference_id instead of the full catalog. Omit to return all trigger types.',
    ),
};

export class GetAgentCatalogTool extends BaseMondayApiTool<typeof getAgentCatalogToolSchema> {
  name = 'get_agent_catalog';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get monday Platform Agent Catalog',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Fetch the account-wide catalog of available trigger types or skills for monday platform agents.

ALWAYS call this tool first before adding a trigger or skill to an agent:
- type:"triggers" — returns entries with block_reference_id (required for manage_agent_triggers action:add), name, description, field_schemas (describes the field_values shape to pass when adding — e.g. { board_id: "<ID>" }), and required_fields (fields the user must supply before you can call add).
- type:"skills" — returns entries with id (required for manage_agent_skills), name, description.

Never guess or invent a block_reference_id or skill id — always look them up here first.

USAGE EXAMPLES:
- List all trigger types: { "type": "triggers" }
- Fetch a specific trigger type: { "type": "triggers", "block_reference_ids": ["some-block-ref-id"] }
- List all skills: { "type": "skills" }`;
  }

  getInputSchema() {
    return getAgentCatalogToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getAgentCatalogToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.type === 'triggers') {
      try {
        const variables: GetAgentTriggersCatalogQueryVariables = {
          block_reference_ids: input.block_reference_ids ?? undefined,
        };
        const res = await this.mondayApi.request<GetAgentTriggersCatalogQuery>(
          getAgentTriggersCatalogQuery,
          variables,
          { versionOverride: 'dev' },
        );
        const catalog = res.agent_triggers_catalog ?? [];
        return {
          content: {
            message:
              'Available trigger types for monday platform agents. Use block_reference_id and inspect field_schemas/required_fields before calling manage_agent_triggers with action:add.',
            count: catalog.length,
            triggers: catalog,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'fetch monday platform agent triggers catalog');
      }
    }

    try {
      const res = await this.mondayApi.request<GetAgentSkillsCatalogQuery>(
        getAgentSkillsCatalogQuery,
        {},
        { versionOverride: 'dev' },
      );
      const catalog = res.agent_skills_catalog ?? [];
      return {
        content: {
          message: 'Available skills for monday platform agents. Use id when calling manage_agent_skills.',
          count: catalog.length,
          skills: catalog,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'fetch monday platform agent skills catalog');
    }
  }
}
```

- [ ] **Step 4: Register the tool**

In `src/core/tools/platform-api-tools/agents-tools/index.ts`, add:
```typescript
export * from './get-agent-catalog/get-agent-catalog-tool';
```

In `src/core/tools/platform-api-tools/index.ts`, add the import after the existing agent imports (line ~70):
```typescript
import { GetAgentCatalogTool } from './agents-tools/get-agent-catalog/get-agent-catalog-tool';
```

And add to `allGraphqlApiTools` array after `DeleteAgentTool` (line ~143):
```typescript
  GetAgentCatalogTool,
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/agent-toolkit && npx jest src/core/tools/platform-api-tools/agents-tools/get-agent-catalog --no-coverage 2>&1 | tail -10
```

Expected: PASS — all 8 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/core/tools/platform-api-tools/agents-tools/
git add src/core/tools/platform-api-tools/index.ts
git commit -m "feat(agent-toolkit): add get_agent_catalog tool"
```

---

## Task 5: `manage_agent_triggers` tool

**Files:**
- Create: `src/core/tools/platform-api-tools/agents-tools/manage-agent-triggers/manage-agent-triggers-tool.test.ts`
- Create: `src/core/tools/platform-api-tools/agents-tools/manage-agent-triggers/manage-agent-triggers-tool.ts`
- Modify: `src/core/tools/platform-api-tools/agents-tools/index.ts`
- Modify: `src/core/tools/platform-api-tools/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/core/tools/platform-api-tools/agents-tools/manage-agent-triggers/manage-agent-triggers-tool.test.ts
import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import {
  GetAgentActiveTriggersQuery,
  AddTriggerToAgentMutation,
  RemoveTriggerFromAgentMutation,
} from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('ManageAgentTriggersTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockActiveTrigger = {
    node_id: 'node-abc',
    block_reference_id: 'status-change-ref',
    name: 'Status Change',
    description: 'Fires when a status column changes',
    field_summary: 'board_id=42',
  };

  it('should list active triggers for an agent', async () => {
    mocks.setResponseOnce({ agent_active_triggers: [mockActiveTrigger] } as GetAgentActiveTriggersQuery);

    const result = await callToolByNameRawAsync('manage_agent_triggers', { action: 'list', agent_id: '7' });
    const parsed = parseToolResult(result);

    expect(parsed.count).toBe(1);
    expect(parsed.triggers[0].node_id).toBe('node-abc');
  });

  it('should pass agent_id and versionOverride dev when listing', async () => {
    mocks.setResponseOnce({ agent_active_triggers: [] } as GetAgentActiveTriggersQuery);

    await callToolByNameRawAsync('manage_agent_triggers', { action: 'list', agent_id: '7' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('getAgentActiveTriggers'),
      { agent_id: '7' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should add a trigger to an agent', async () => {
    mocks.setResponseOnce({ add_trigger_to_agent: { success: true } } as AddTriggerToAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_triggers', {
      action: 'add',
      agent_id: '7',
      block_reference_id: 'status-change-ref',
      field_values: { board_id: '42' },
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  it('should pass block_reference_id and field_values when adding trigger', async () => {
    mocks.setResponseOnce({ add_trigger_to_agent: { success: true } } as AddTriggerToAgentMutation);

    await callToolByNameRawAsync('manage_agent_triggers', {
      action: 'add',
      agent_id: '7',
      block_reference_id: 'status-change-ref',
      field_values: { board_id: '42' },
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('addTriggerToAgent'),
      { agent_id: '7', block_reference_id: 'status-change-ref', field_values: { board_id: '42' } },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should add a trigger without field_values when omitted', async () => {
    mocks.setResponseOnce({ add_trigger_to_agent: { success: true } } as AddTriggerToAgentMutation);

    await callToolByNameRawAsync('manage_agent_triggers', {
      action: 'add',
      agent_id: '7',
      block_reference_id: 'status-change-ref',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ field_values: undefined }),
      expect.anything(),
    );
  });

  it('should remove a trigger from an agent', async () => {
    mocks.setResponseOnce({ remove_trigger_from_agent: { success: true } } as RemoveTriggerFromAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_triggers', {
      action: 'remove',
      agent_id: '7',
      node_id: 'node-abc',
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  it('should pass node_id and versionOverride dev when removing', async () => {
    mocks.setResponseOnce({ remove_trigger_from_agent: { success: true } } as RemoveTriggerFromAgentMutation);

    await callToolByNameRawAsync('manage_agent_triggers', { action: 'remove', agent_id: '7', node_id: 'node-abc' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('removeTriggerFromAgent'),
      { agent_id: '7', node_id: 'node-abc' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should reject add action without block_reference_id', async () => {
    const result = await callToolByNameRawAsync('manage_agent_triggers', { action: 'add', agent_id: '7' });

    expect(result.content[0].text).toContain('block_reference_id is required');
  });

  it('should reject remove action without node_id', async () => {
    const result = await callToolByNameRawAsync('manage_agent_triggers', { action: 'remove', agent_id: '7' });

    expect(result.content[0].text).toContain('node_id is required');
  });

  it('should propagate errors with operation context', async () => {
    mocks.setError('Not found');

    const result = await callToolByNameRawAsync('manage_agent_triggers', { action: 'list', agent_id: '999' });

    expect(result.content[0].text).toContain('Failed to list active triggers');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/agent-toolkit && npx jest src/core/tools/platform-api-tools/agents-tools/manage-agent-triggers --no-coverage 2>&1 | tail -10
```

Expected: FAIL — tool not registered yet.

- [ ] **Step 3: Implement the tool**

```typescript
// src/core/tools/platform-api-tools/agents-tools/manage-agent-triggers/manage-agent-triggers-tool.ts
import { z } from 'zod';
import {
  GetAgentActiveTriggersQuery,
  GetAgentActiveTriggersQueryVariables,
  AddTriggerToAgentMutation,
  AddTriggerToAgentMutationVariables,
  RemoveTriggerFromAgentMutation,
  RemoveTriggerFromAgentMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import {
  getAgentActiveTriggersQuery,
  addTriggerToAgentMutation,
  removeTriggerFromAgentMutation,
} from './manage-agent-triggers.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const manageAgentTriggersToolSchema = {
  action: z
    .enum(['list', 'add', 'remove'])
    .describe(
      '"list" — returns all triggers currently attached to the agent (includes node_id needed for remove). "add" — attaches a new trigger by block_reference_id. "remove" — detaches a trigger by node_id.',
    ),
  agent_id: z.string().trim().min(1, 'agent_id must be a non-empty string').describe('Unique identifier of the agent.'),
  block_reference_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Required for action:add. The block_reference_id from get_agent_catalog (type:triggers) identifying the trigger type to attach. Never guess this value — look it up in the catalog first.',
    ),
  field_values: z
    .record(z.unknown())
    .optional()
    .describe(
      'Required for action:add when the trigger type has required_fields. A key/value object whose shape is described by field_schemas in the get_agent_catalog response. Example: { "board_id": "12345" }. For scheduler fields pass the structured config directly; for selection fields (e.g. board picker) pass { "value": "<id>", "label": "<name>" }.',
    ),
  node_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Required for action:remove. The node_id of the trigger instance to remove — get it from action:list. Each trigger instance has a unique node_id even if the same trigger type is attached multiple times.',
    ),
};

export class ManageAgentTriggersTool extends BaseMondayApiTool<typeof manageAgentTriggersToolSchema> {
  name = 'manage_agent_triggers';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Manage monday Platform Agent Triggers',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `List, add, or remove triggers on a monday platform agent.

Triggers define when an agent runs automatically — for example, when a board status changes, when a date arrives, or on a schedule.

WORKFLOW FOR ADD:
1. Call get_agent_catalog with type:"triggers" to find the right trigger type by name/description. Note its block_reference_id and inspect field_schemas (describes what field_values to pass) and required_fields (fields you must collect from the user — e.g. which board, which column).
2. Collect any required field values from the user.
3. Call this tool with action:"add", the block_reference_id, and the assembled field_values.

WORKFLOW FOR REMOVE:
1. Call this tool with action:"list" to see active triggers by name and field_summary. Match the trigger the user described, note its node_id.
2. Call this tool with action:"remove" and that node_id.

USAGE EXAMPLES:
- List triggers: { "action": "list", "agent_id": "7" }
- Add trigger: { "action": "add", "agent_id": "7", "block_reference_id": "status-change-ref", "field_values": { "board_id": "42" } }
- Remove trigger: { "action": "remove", "agent_id": "7", "node_id": "node-abc" }`;
  }

  getInputSchema() {
    return manageAgentTriggersToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof manageAgentTriggersToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.action === 'list') {
      try {
        const variables: GetAgentActiveTriggersQueryVariables = { agent_id: input.agent_id };
        const res = await this.mondayApi.request<GetAgentActiveTriggersQuery>(
          getAgentActiveTriggersQuery,
          variables,
          { versionOverride: 'dev' },
        );
        const triggers = res.agent_active_triggers ?? [];
        return {
          content: {
            message: 'Active triggers on this agent. Use node_id with action:remove to detach a trigger.',
            count: triggers.length,
            triggers,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'list active triggers for monday platform agent');
      }
    }

    if (input.action === 'add') {
      if (!input.block_reference_id) {
        throw new Error('block_reference_id is required for action:add. Call get_agent_catalog with type:triggers first.');
      }
      try {
        const variables: AddTriggerToAgentMutationVariables = {
          agent_id: input.agent_id,
          block_reference_id: input.block_reference_id,
          field_values: input.field_values ?? undefined,
        };
        const res = await this.mondayApi.request<AddTriggerToAgentMutation>(
          addTriggerToAgentMutation,
          variables,
          { versionOverride: 'dev' },
        );
        return {
          content: {
            message: 'Trigger added to agent. Call manage_agent_triggers with action:list to verify.',
            success: res.add_trigger_to_agent?.success ?? false,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'add trigger to monday platform agent');
      }
    }

    if (!input.node_id) {
      throw new Error('node_id is required for action:remove. Call manage_agent_triggers with action:list first to get node_id values.');
    }
    try {
      const variables: RemoveTriggerFromAgentMutationVariables = {
        agent_id: input.agent_id,
        node_id: input.node_id,
      };
      const res = await this.mondayApi.request<RemoveTriggerFromAgentMutation>(
        removeTriggerFromAgentMutation,
        variables,
        { versionOverride: 'dev' },
      );
      return {
        content: {
          message: 'Trigger removed from agent.',
          success: res.remove_trigger_from_agent?.success ?? false,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'remove trigger from monday platform agent');
    }
  }
}
```

- [ ] **Step 4: Register the tool**

In `src/core/tools/platform-api-tools/agents-tools/index.ts`, add:
```typescript
export * from './manage-agent-triggers/manage-agent-triggers-tool';
```

In `src/core/tools/platform-api-tools/index.ts`, add import:
```typescript
import { ManageAgentTriggersTool } from './agents-tools/manage-agent-triggers/manage-agent-triggers-tool';
```

Add to `allGraphqlApiTools` array:
```typescript
  ManageAgentTriggersTool,
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/agent-toolkit && npx jest src/core/tools/platform-api-tools/agents-tools/manage-agent-triggers --no-coverage 2>&1 | tail -10
```

Expected: PASS — all 10 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/core/tools/platform-api-tools/agents-tools/
git add src/core/tools/platform-api-tools/index.ts
git commit -m "feat(agent-toolkit): add manage_agent_triggers tool"
```

---

## Task 6: `manage_agent_skills` tool

**Files:**
- Create: `src/core/tools/platform-api-tools/agents-tools/manage-agent-skills/manage-agent-skills-tool.test.ts`
- Create: `src/core/tools/platform-api-tools/agents-tools/manage-agent-skills/manage-agent-skills-tool.ts`
- Modify: `src/core/tools/platform-api-tools/agents-tools/index.ts`
- Modify: `src/core/tools/platform-api-tools/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/core/tools/platform-api-tools/agents-tools/manage-agent-skills/manage-agent-skills-tool.test.ts
import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import {
  AddSkillToAgentMutation,
  RemoveSkillFromAgentMutation,
} from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('ManageAgentSkillsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  it('should add a skill to an agent', async () => {
    mocks.setResponseOnce({ add_skill_to_agent: { success: true } } as AddSkillToAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'add',
      agent_id: '7',
      skill_id: 'skill-1',
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  it('should pass agent_id, skill_id and versionOverride dev when adding', async () => {
    mocks.setResponseOnce({ add_skill_to_agent: { success: true } } as AddSkillToAgentMutation);

    await callToolByNameRawAsync('manage_agent_skills', { action: 'add', agent_id: '7', skill_id: 'skill-1' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('addSkillToAgent'),
      { agent_id: '7', skill_id: 'skill-1' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should remove a skill from an agent', async () => {
    mocks.setResponseOnce({ remove_skill_from_agent: { success: true } } as RemoveSkillFromAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'remove',
      agent_id: '7',
      skill_id: 'skill-1',
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  it('should pass agent_id, skill_id and versionOverride dev when removing', async () => {
    mocks.setResponseOnce({ remove_skill_from_agent: { success: true } } as RemoveSkillFromAgentMutation);

    await callToolByNameRawAsync('manage_agent_skills', { action: 'remove', agent_id: '7', skill_id: 'skill-1' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('removeSkillFromAgent'),
      { agent_id: '7', skill_id: 'skill-1' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should propagate errors with operation context on add', async () => {
    mocks.setError('Skill not found');

    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'add',
      agent_id: '7',
      skill_id: 'bad-id',
    });

    expect(result.content[0].text).toContain('Failed to add skill to monday platform agent');
  });

  it('should propagate errors with operation context on remove', async () => {
    mocks.setError('Skill not found');

    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'remove',
      agent_id: '7',
      skill_id: 'bad-id',
    });

    expect(result.content[0].text).toContain('Failed to remove skill from monday platform agent');
  });

  it('should reject whitespace-only skill_id', async () => {
    const result = await callToolByNameRawAsync('manage_agent_skills', {
      action: 'add',
      agent_id: '7',
      skill_id: '   ',
    });

    expect(result.content[0].text).toContain('skill_id must be a non-empty string');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/agent-toolkit && npx jest src/core/tools/platform-api-tools/agents-tools/manage-agent-skills --no-coverage 2>&1 | tail -10
```

Expected: FAIL — tool not registered yet.

- [ ] **Step 3: Implement the tool**

```typescript
// src/core/tools/platform-api-tools/agents-tools/manage-agent-skills/manage-agent-skills-tool.ts
import { z } from 'zod';
import {
  AddSkillToAgentMutation,
  AddSkillToAgentMutationVariables,
  RemoveSkillFromAgentMutation,
  RemoveSkillFromAgentMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { addSkillToAgentMutation, removeSkillFromAgentMutation } from './manage-agent-skills.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const manageAgentSkillsToolSchema = {
  action: z.enum(['add', 'remove']).describe('"add" — attach a skill to the agent. "remove" — detach a skill from the agent.'),
  agent_id: z.string().trim().min(1, 'agent_id must be a non-empty string').describe('Unique identifier of the agent.'),
  skill_id: z
    .string()
    .trim()
    .min(1, 'skill_id must be a non-empty string')
    .describe(
      'The skill id from get_agent_catalog (type:skills). Never guess this value — look it up in the catalog first.',
    ),
};

export class ManageAgentSkillsTool extends BaseMondayApiTool<typeof manageAgentSkillsToolSchema> {
  name = 'manage_agent_skills';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Manage monday Platform Agent Skills',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Attach or detach a skill from a monday platform agent.

Skills extend what an agent can do — they grant access to specific monday.com capabilities.

ALWAYS call get_agent_catalog with type:"skills" first to discover available skills and resolve the correct skill_id. Never guess or invent a skill_id.

To see which skills are already attached to an agent, call get_agent and inspect the skill_ids array, then cross-reference with get_agent_catalog to get names and descriptions.

USAGE EXAMPLES:
- Attach a skill: { "action": "add", "agent_id": "7", "skill_id": "skill-1" }
- Detach a skill: { "action": "remove", "agent_id": "7", "skill_id": "skill-1" }`;
  }

  getInputSchema() {
    return manageAgentSkillsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof manageAgentSkillsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.action === 'add') {
      try {
        const variables: AddSkillToAgentMutationVariables = {
          agent_id: input.agent_id,
          skill_id: input.skill_id,
        };
        const res = await this.mondayApi.request<AddSkillToAgentMutation>(
          addSkillToAgentMutation,
          variables,
          { versionOverride: 'dev' },
        );
        return {
          content: {
            message: `Skill ${input.skill_id} added to agent ${input.agent_id}.`,
            success: res.add_skill_to_agent?.success ?? false,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'add skill to monday platform agent');
      }
    }

    try {
      const variables: RemoveSkillFromAgentMutationVariables = {
        agent_id: input.agent_id,
        skill_id: input.skill_id,
      };
      const res = await this.mondayApi.request<RemoveSkillFromAgentMutation>(
        removeSkillFromAgentMutation,
        variables,
        { versionOverride: 'dev' },
      );
      return {
        content: {
          message: `Skill ${input.skill_id} removed from agent ${input.agent_id}.`,
          success: res.remove_skill_from_agent?.success ?? false,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'remove skill from monday platform agent');
    }
  }
}
```

- [ ] **Step 4: Register the tool**

In `src/core/tools/platform-api-tools/agents-tools/index.ts`, add:
```typescript
export * from './manage-agent-skills/manage-agent-skills-tool';
```

In `src/core/tools/platform-api-tools/index.ts`, add import:
```typescript
import { ManageAgentSkillsTool } from './agents-tools/manage-agent-skills/manage-agent-skills-tool';
```

Add to `allGraphqlApiTools` array:
```typescript
  ManageAgentSkillsTool,
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/agent-toolkit && npx jest src/core/tools/platform-api-tools/agents-tools/manage-agent-skills --no-coverage 2>&1 | tail -10
```

Expected: PASS — all 7 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/core/tools/platform-api-tools/agents-tools/
git add src/core/tools/platform-api-tools/index.ts
git commit -m "feat(agent-toolkit): add manage_agent_skills tool"
```

---

## Task 7: `update_agent` tool

**Files:**
- Create: `src/core/tools/platform-api-tools/agents-tools/update-agent/update-agent-tool.test.ts`
- Create: `src/core/tools/platform-api-tools/agents-tools/update-agent/update-agent-tool.ts`
- Modify: `src/core/tools/platform-api-tools/agents-tools/index.ts`
- Modify: `src/core/tools/platform-api-tools/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/core/tools/platform-api-tools/agents-tools/update-agent/update-agent-tool.test.ts
import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import { UpdateAgentMutation } from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('UpdateAgentTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockAgent = {
    id: '7',
    kind: 'PERSONAL',
    state: 'INACTIVE',
    profile: {
      name: 'Updated Bot',
      role: 'Analyst',
      role_description: 'Analyses data',
      avatar_url: 'https://example.com/a.png',
      background_color: '#000000',
    },
    goal: 'Analyse stuff',
    plan: '# Updated Plan',
    user_prompt: null,
    version_id: '2',
    created_at: '2026-04-29T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
  };

  it('should return the updated agent', async () => {
    mocks.setResponseOnce({ update_agent: mockAgent } as UpdateAgentMutation);

    const result = await callToolByNameRawAsync('update_agent', { id: '7', name: 'Updated Bot' });
    const parsed = parseToolResult(result);

    expect(parsed.agent.id).toBe('7');
    expect(parsed.agent.profile.name).toBe('Updated Bot');
  });

  it('should pass id, input and versionOverride dev', async () => {
    mocks.setResponseOnce({ update_agent: mockAgent } as UpdateAgentMutation);

    await callToolByNameRawAsync('update_agent', { id: '7', name: 'Updated Bot', plan: '# New Plan' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('updateAgent'),
      { id: '7', input: { name: 'Updated Bot', plan: '# New Plan' } },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should only include provided fields in input', async () => {
    mocks.setResponseOnce({ update_agent: mockAgent } as UpdateAgentMutation);

    await callToolByNameRawAsync('update_agent', { id: '7', plan: '# Plan only' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      { id: '7', input: { plan: '# Plan only' } },
      expect.anything(),
    );
  });

  it('should not include agent_model in input when omitted', async () => {
    mocks.setResponseOnce({ update_agent: mockAgent } as UpdateAgentMutation);

    await callToolByNameRawAsync('update_agent', { id: '7', name: 'Bot' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      { id: '7', input: { name: 'Bot' } },
      expect.anything(),
    );
  });

  it('should propagate GraphQL errors with operation context', async () => {
    mocks.setError('Agent not found');

    const result = await callToolByNameRawAsync('update_agent', { id: '999', name: 'x' });

    expect(result.content[0].text).toContain('Failed to update monday platform agent');
  });

  it('should throw a "returned no id" error when update_agent returns null', async () => {
    mocks.setResponseOnce({ update_agent: null } as UpdateAgentMutation);

    const result = await callToolByNameRawAsync('update_agent', { id: '7', name: 'x' });

    expect(result.content[0].text).toContain('returned no id');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/agent-toolkit && npx jest src/core/tools/platform-api-tools/agents-tools/update-agent --no-coverage 2>&1 | tail -10
```

Expected: FAIL — tool not registered yet.

- [ ] **Step 3: Implement the tool**

```typescript
// src/core/tools/platform-api-tools/agents-tools/update-agent/update-agent-tool.ts
import { z } from 'zod';
import {
  UpdateAgentMutation,
  UpdateAgentMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { updateAgentMutation } from './update-agent.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const updateAgentToolSchema = {
  id: z.string().trim().min(1, 'Agent id must be a non-empty string').describe('Unique identifier of the agent to update.'),
  name: z.string().trim().min(1).optional().describe('New display name for the agent.'),
  role: z.string().trim().min(1).optional().describe('New role for the agent.'),
  role_description: z.string().trim().min(1).optional().describe('New role description for the agent.'),
  plan: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('New execution plan for the agent, in markdown format. This is the agent\'s core instructions.'),
  agent_model: z
    .string()
    .optional()
    .describe(
      'STRONGLY DISCOURAGED — omit this field. Only set when the user explicitly names a monday-supported model. Do not invent or guess model identifiers. When omitted the existing model is kept.',
    ),
};

export class UpdateAgentTool extends BaseMondayApiTool<typeof updateAgentToolSchema> {
  name = 'update_agent';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update monday Platform Agent',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Update a monday platform agent's profile or execution plan. Creates a new draft internally and publishes in one call.

All fields are optional — only provided fields are changed. Omit fields you do not want to update.

The plan field is the most impactful: it contains the agent's execution instructions in markdown format. Updating it changes how the agent behaves on every future run.

If the user refers to the agent by name rather than id, call get_agent first to resolve the correct id.

USAGE EXAMPLES:
- Update plan only: { "id": "7", "plan": "# New Plan\\n- Step 1\\n- Step 2" }
- Rename the agent: { "id": "7", "name": "Improved Standup Bot" }`;
  }

  getInputSchema() {
    return updateAgentToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof updateAgentToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const updateInput: UpdateAgentMutationVariables['input'] = {};
      if (input.name !== undefined) updateInput.name = input.name;
      if (input.role !== undefined) updateInput.role = input.role;
      if (input.role_description !== undefined) updateInput.role_description = input.role_description;
      if (input.plan !== undefined) updateInput.plan = input.plan;
      if (input.agent_model !== undefined) updateInput.agent_model = input.agent_model as any;

      const variables: UpdateAgentMutationVariables = { id: input.id, input: updateInput };
      const res = await this.mondayApi.request<UpdateAgentMutation>(updateAgentMutation, variables, {
        versionOverride: 'dev',
      });

      if (!res.update_agent?.id) {
        throw new Error('monday platform agent update returned no id');
      }

      return {
        content: {
          message: `monday platform agent ${res.update_agent.id} updated`,
          agent: res.update_agent,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'update monday platform agent');
    }
  }
}
```

- [ ] **Step 4: Register the tool**

In `src/core/tools/platform-api-tools/agents-tools/index.ts`, add:
```typescript
export * from './update-agent/update-agent-tool';
```

In `src/core/tools/platform-api-tools/index.ts`, add import:
```typescript
import { UpdateAgentTool } from './agents-tools/update-agent/update-agent-tool';
```

Add to `allGraphqlApiTools` array:
```typescript
  UpdateAgentTool,
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/agent-toolkit && npx jest src/core/tools/platform-api-tools/agents-tools/update-agent --no-coverage 2>&1 | tail -10
```

Expected: PASS — all 6 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/core/tools/platform-api-tools/agents-tools/
git add src/core/tools/platform-api-tools/index.ts
git commit -m "feat(agent-toolkit): add update_agent tool"
```

---

## Task 8: `manage_agent_state` tool

**Files:**
- Create: `src/core/tools/platform-api-tools/agents-tools/manage-agent-state/manage-agent-state-tool.test.ts`
- Create: `src/core/tools/platform-api-tools/agents-tools/manage-agent-state/manage-agent-state-tool.ts`
- Modify: `src/core/tools/platform-api-tools/agents-tools/index.ts`
- Modify: `src/core/tools/platform-api-tools/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/core/tools/platform-api-tools/agents-tools/manage-agent-state/manage-agent-state-tool.test.ts
import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import {
  ActivateAgentMutation,
  DeactivateAgentMutation,
  RunAgentMutation,
} from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('ManageAgentStateTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  it('should activate an agent', async () => {
    mocks.setResponseOnce({ activate_agent: { success: true } } as ActivateAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_state', { action: 'activate', agent_id: '7' });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  it('should pass id and versionOverride dev when activating', async () => {
    mocks.setResponseOnce({ activate_agent: { success: true } } as ActivateAgentMutation);

    await callToolByNameRawAsync('manage_agent_state', { action: 'activate', agent_id: '7' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('activateAgent'),
      { id: '7' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should deactivate an agent', async () => {
    mocks.setResponseOnce({ deactivate_agent: { success: true } } as DeactivateAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_state', { action: 'deactivate', agent_id: '7' });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  it('should pass inactive_reason when deactivating', async () => {
    mocks.setResponseOnce({ deactivate_agent: { success: true } } as DeactivateAgentMutation);

    await callToolByNameRawAsync('manage_agent_state', {
      action: 'deactivate',
      agent_id: '7',
      inactive_reason: 'DEACTIVATED_BY_USER',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('deactivateAgent'),
      { id: '7', inactive_reason: 'DEACTIVATED_BY_USER' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should pass undefined inactive_reason when omitted', async () => {
    mocks.setResponseOnce({ deactivate_agent: { success: true } } as DeactivateAgentMutation);

    await callToolByNameRawAsync('manage_agent_state', { action: 'deactivate', agent_id: '7' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      { id: '7', inactive_reason: undefined },
      expect.anything(),
    );
  });

  it('should run an agent and return trigger_uuid', async () => {
    mocks.setResponseOnce({ run_agent: { trigger_uuid: 'uuid-xyz' } } as RunAgentMutation);

    const result = await callToolByNameRawAsync('manage_agent_state', { action: 'run', agent_id: '7' });
    const parsed = parseToolResult(result);

    expect(parsed.trigger_uuid).toBe('uuid-xyz');
  });

  it('should pass id and versionOverride dev when running', async () => {
    mocks.setResponseOnce({ run_agent: { trigger_uuid: 'uuid-xyz' } } as RunAgentMutation);

    await callToolByNameRawAsync('manage_agent_state', { action: 'run', agent_id: '7' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('runAgent'),
      { id: '7' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should propagate errors with operation context on activate', async () => {
    mocks.setError('Agent not found');

    const result = await callToolByNameRawAsync('manage_agent_state', { action: 'activate', agent_id: '999' });

    expect(result.content[0].text).toContain('Failed to activate monday platform agent');
  });

  it('should propagate errors with operation context on run', async () => {
    mocks.setError('Agent not active');

    const result = await callToolByNameRawAsync('manage_agent_state', { action: 'run', agent_id: '7' });

    expect(result.content[0].text).toContain('Failed to run monday platform agent');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/agent-toolkit && npx jest src/core/tools/platform-api-tools/agents-tools/manage-agent-state --no-coverage 2>&1 | tail -10
```

Expected: FAIL — tool not registered yet.

- [ ] **Step 3: Implement the tool**

```typescript
// src/core/tools/platform-api-tools/agents-tools/manage-agent-state/manage-agent-state-tool.ts
import { z } from 'zod';
import {
  ActivateAgentMutation,
  ActivateAgentMutationVariables,
  DeactivateAgentMutation,
  DeactivateAgentMutationVariables,
  RunAgentMutation,
  RunAgentMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { activateAgentMutation, deactivateAgentMutation, runAgentMutation } from './manage-agent-state.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const manageAgentStateToolSchema = {
  action: z
    .enum(['activate', 'deactivate', 'run'])
    .describe(
      '"activate" — transitions the agent to ACTIVE state so it can be triggered. "deactivate" — transitions the agent to INACTIVE. "run" — manually enqueues a one-off agent run (fire-and-forget; returns trigger_uuid for tracking).',
    ),
  agent_id: z.string().trim().min(1, 'agent_id must be a non-empty string').describe('Unique identifier of the agent.'),
  inactive_reason: z
    .enum(['DEACTIVATED_BY_USER', 'ACCOUNT_LEVEL_BLOCKING'])
    .optional()
    .describe('Only applies to action:deactivate. Defaults to DEACTIVATED_BY_USER when omitted.'),
};

export class ManageAgentStateTool extends BaseMondayApiTool<typeof manageAgentStateToolSchema> {
  name = 'manage_agent_state';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Manage monday Platform Agent State',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Activate, deactivate, or manually run a monday platform agent.

Agents created by create_agent start in state INACTIVE and cannot be triggered until activated.

action:"activate" — sets the agent to ACTIVE. The agent can now be triggered by its configured triggers or manually via action:"run".
action:"deactivate" — sets the agent to INACTIVE. Existing triggers stop firing.
action:"run" — fires a one-off manual run immediately. This is async (fire-and-forget): the response confirms the run was accepted and enqueued, not that it has completed. Use trigger_uuid to correlate the execution in logs or future status endpoints. The agent must be ACTIVE to run.

USAGE EXAMPLES:
- Activate: { "action": "activate", "agent_id": "7" }
- Deactivate: { "action": "deactivate", "agent_id": "7" }
- Run manually: { "action": "run", "agent_id": "7" }`;
  }

  getInputSchema() {
    return manageAgentStateToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof manageAgentStateToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.action === 'activate') {
      try {
        const variables: ActivateAgentMutationVariables = { id: input.agent_id };
        const res = await this.mondayApi.request<ActivateAgentMutation>(activateAgentMutation, variables, {
          versionOverride: 'dev',
        });
        return {
          content: {
            message: `monday platform agent ${input.agent_id} activated`,
            success: res.activate_agent?.success ?? false,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'activate monday platform agent');
      }
    }

    if (input.action === 'deactivate') {
      try {
        const variables: DeactivateAgentMutationVariables = {
          id: input.agent_id,
          inactive_reason: input.inactive_reason ?? undefined,
        };
        const res = await this.mondayApi.request<DeactivateAgentMutation>(deactivateAgentMutation, variables, {
          versionOverride: 'dev',
        });
        return {
          content: {
            message: `monday platform agent ${input.agent_id} deactivated`,
            success: res.deactivate_agent?.success ?? false,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'deactivate monday platform agent');
      }
    }

    try {
      const variables: RunAgentMutationVariables = { id: input.agent_id };
      const res = await this.mondayApi.request<RunAgentMutation>(runAgentMutation, variables, {
        versionOverride: 'dev',
      });
      return {
        content: {
          message: `monday platform agent ${input.agent_id} run enqueued — execution is async. Use trigger_uuid to track.`,
          trigger_uuid: res.run_agent?.trigger_uuid,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'run monday platform agent');
    }
  }
}
```

- [ ] **Step 4: Register the tool**

In `src/core/tools/platform-api-tools/agents-tools/index.ts`, add:
```typescript
export * from './manage-agent-state/manage-agent-state-tool';
```

In `src/core/tools/platform-api-tools/index.ts`, add import:
```typescript
import { ManageAgentStateTool } from './agents-tools/manage-agent-state/manage-agent-state-tool';
```

Add to `allGraphqlApiTools` array:
```typescript
  ManageAgentStateTool,
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/agent-toolkit && npx jest src/core/tools/platform-api-tools/agents-tools/manage-agent-state --no-coverage 2>&1 | tail -10
```

Expected: PASS — all 9 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/core/tools/platform-api-tools/agents-tools/
git add src/core/tools/platform-api-tools/index.ts
git commit -m "feat(agent-toolkit): add manage_agent_state tool"
```

---

## Task 9: `manage_agent_knowledge` tool

**Files:**
- Create: `src/core/tools/platform-api-tools/agents-tools/manage-agent-knowledge/manage-agent-knowledge-tool.test.ts`
- Create: `src/core/tools/platform-api-tools/agents-tools/manage-agent-knowledge/manage-agent-knowledge-tool.ts`
- Modify: `src/core/tools/platform-api-tools/agents-tools/index.ts`
- Modify: `src/core/tools/platform-api-tools/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/core/tools/platform-api-tools/agents-tools/manage-agent-knowledge/manage-agent-knowledge-tool.test.ts
import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import {
  GetAgentKnowledgeQuery,
  AddAgentResourceAccessMutation,
  RemoveAgentResourceAccessMutation,
  UpdateAgentResourceAccessMutation,
} from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('ManageAgentKnowledgeTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockKnowledge = {
    resources: [{ resource_id: '42', scope_type: 'BOARD', permission_type: 'READ' }],
    files: [{ id: 'f1', file_name: 'spec.pdf', file_type: 'pdf' }],
  };

  it('should list agent knowledge', async () => {
    mocks.setResponseOnce({ agent_knowledge: mockKnowledge } as GetAgentKnowledgeQuery);

    const result = await callToolByNameRawAsync('manage_agent_knowledge', { action: 'list', agent_id: '7' });
    const parsed = parseToolResult(result);

    expect(parsed.resources[0].resource_id).toBe('42');
    expect(parsed.files[0].file_name).toBe('spec.pdf');
  });

  it('should pass id and versionOverride dev when listing', async () => {
    mocks.setResponseOnce({ agent_knowledge: { resources: [], files: [] } } as GetAgentKnowledgeQuery);

    await callToolByNameRawAsync('manage_agent_knowledge', { action: 'list', agent_id: '7' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('getAgentKnowledge'),
      { id: '7' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should add a resource access', async () => {
    mocks.setResponseOnce({ add_agent_resource_access: { success: true } } as AddAgentResourceAccessMutation);

    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'add',
      agent_id: '7',
      resource_id: '42',
      scope_type: 'BOARD',
      permission_type: 'READ',
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  it('should pass all fields and versionOverride dev when adding', async () => {
    mocks.setResponseOnce({ add_agent_resource_access: { success: true } } as AddAgentResourceAccessMutation);

    await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'add',
      agent_id: '7',
      resource_id: '42',
      scope_type: 'BOARD',
      permission_type: 'READ_WRITE',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('addAgentResourceAccess'),
      { id: '7', resource_id: '42', scope_type: 'BOARD', permission_type: 'READ_WRITE' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should update a resource permission', async () => {
    mocks.setResponseOnce({ update_agent_resource_access: { success: true } } as UpdateAgentResourceAccessMutation);

    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'update',
      agent_id: '7',
      resource_id: '42',
      scope_type: 'BOARD',
      permission_type: 'READ_WRITE',
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  it('should remove a resource access', async () => {
    mocks.setResponseOnce({ remove_agent_resource_access: { success: true } } as RemoveAgentResourceAccessMutation);

    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'remove',
      agent_id: '7',
      resource_id: '42',
      scope_type: 'BOARD',
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  it('should pass id, resource_id, scope_type and versionOverride dev when removing', async () => {
    mocks.setResponseOnce({ remove_agent_resource_access: { success: true } } as RemoveAgentResourceAccessMutation);

    await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'remove',
      agent_id: '7',
      resource_id: '42',
      scope_type: 'DOC',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('removeAgentResourceAccess'),
      { id: '7', resource_id: '42', scope_type: 'DOC' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should reject add action without resource_id', async () => {
    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'add',
      agent_id: '7',
      scope_type: 'BOARD',
      permission_type: 'READ',
    });

    expect(result.content[0].text).toContain('resource_id is required');
  });

  it('should reject add action without permission_type', async () => {
    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'add',
      agent_id: '7',
      resource_id: '42',
      scope_type: 'BOARD',
    });

    expect(result.content[0].text).toContain('permission_type is required');
  });

  it('should propagate errors with operation context', async () => {
    mocks.setError('Board not found');

    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'add',
      agent_id: '7',
      resource_id: '99',
      scope_type: 'BOARD',
      permission_type: 'READ',
    });

    expect(result.content[0].text).toContain('Failed to add resource access to monday platform agent');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/agent-toolkit && npx jest src/core/tools/platform-api-tools/agents-tools/manage-agent-knowledge --no-coverage 2>&1 | tail -10
```

Expected: FAIL — tool not registered yet.

- [ ] **Step 3: Implement the tool**

```typescript
// src/core/tools/platform-api-tools/agents-tools/manage-agent-knowledge/manage-agent-knowledge-tool.ts
import { z } from 'zod';
import {
  GetAgentKnowledgeQuery,
  GetAgentKnowledgeQueryVariables,
  AddAgentResourceAccessMutation,
  AddAgentResourceAccessMutationVariables,
  RemoveAgentResourceAccessMutation,
  RemoveAgentResourceAccessMutationVariables,
  UpdateAgentResourceAccessMutation,
  UpdateAgentResourceAccessMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import {
  getAgentKnowledgeQuery,
  addAgentResourceAccessMutation,
  removeAgentResourceAccessMutation,
  updateAgentResourceAccessMutation,
} from './manage-agent-knowledge.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const manageAgentKnowledgeToolSchema = {
  action: z
    .enum(['list', 'add', 'update', 'remove'])
    .describe(
      '"list" — returns current resource access (boards/docs) and uploaded files. "add" — grants access to a board or doc. "update" — changes the permission level on an existing resource. "remove" — revokes access entirely.',
    ),
  agent_id: z.string().trim().min(1, 'agent_id must be a non-empty string').describe('Unique identifier of the agent.'),
  resource_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Required for action:add, update, and remove. The ID of the monday.com board or doc.'),
  scope_type: z
    .enum(['BOARD', 'DOC'])
    .optional()
    .describe('Required for action:add, update, and remove. Whether the resource is a board or a doc.'),
  permission_type: z
    .enum(['READ', 'READ_WRITE'])
    .optional()
    .describe(
      'Required for action:add and update. READ — agent can read the resource. READ_WRITE — agent can read and write.',
    ),
};

export class ManageAgentKnowledgeTool extends BaseMondayApiTool<typeof manageAgentKnowledgeToolSchema> {
  name = 'manage_agent_knowledge';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Manage monday Platform Agent Knowledge',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `List, grant, update, or revoke a monday platform agent's access to boards and docs.

Agent knowledge determines which monday.com resources the agent can read or write when it runs.

Call with action:"list" first to see what resources the agent already has access to before adding, updating, or removing.

action:"add" — grants the agent access to a board or doc. Requires resource_id (the board or doc id), scope_type (BOARD or DOC), and permission_type (READ or READ_WRITE).
action:"update" — changes the permission level on an already-granted resource.
action:"remove" — revokes access to a resource entirely.

USAGE EXAMPLES:
- List resources: { "action": "list", "agent_id": "7" }
- Grant board access: { "action": "add", "agent_id": "7", "resource_id": "42", "scope_type": "BOARD", "permission_type": "READ" }
- Upgrade to read-write: { "action": "update", "agent_id": "7", "resource_id": "42", "scope_type": "BOARD", "permission_type": "READ_WRITE" }
- Revoke access: { "action": "remove", "agent_id": "7", "resource_id": "42", "scope_type": "BOARD" }`;
  }

  getInputSchema() {
    return manageAgentKnowledgeToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof manageAgentKnowledgeToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.action === 'list') {
      try {
        const variables: GetAgentKnowledgeQueryVariables = { id: input.agent_id };
        const res = await this.mondayApi.request<GetAgentKnowledgeQuery>(getAgentKnowledgeQuery, variables, {
          versionOverride: 'dev',
        });
        return {
          content: {
            message: 'Current knowledge configuration for this agent.',
            resources: res.agent_knowledge?.resources ?? [],
            files: res.agent_knowledge?.files ?? [],
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'list knowledge for monday platform agent');
      }
    }

    if (!input.resource_id) {
      throw new Error(`resource_id is required for action:${input.action}.`);
    }
    if (!input.scope_type) {
      throw new Error(`scope_type is required for action:${input.action}.`);
    }

    if (input.action === 'add') {
      if (!input.permission_type) {
        throw new Error('permission_type is required for action:add.');
      }
      try {
        const variables: AddAgentResourceAccessMutationVariables = {
          id: input.agent_id,
          resource_id: input.resource_id,
          scope_type: input.scope_type as any,
          permission_type: input.permission_type as any,
        };
        const res = await this.mondayApi.request<AddAgentResourceAccessMutation>(
          addAgentResourceAccessMutation,
          variables,
          { versionOverride: 'dev' },
        );
        return {
          content: {
            message: `${input.scope_type} ${input.resource_id} granted to agent with ${input.permission_type} permission.`,
            success: res.add_agent_resource_access?.success ?? false,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'add resource access to monday platform agent');
      }
    }

    if (input.action === 'update') {
      if (!input.permission_type) {
        throw new Error('permission_type is required for action:update.');
      }
      try {
        const variables: UpdateAgentResourceAccessMutationVariables = {
          id: input.agent_id,
          resource_id: input.resource_id,
          scope_type: input.scope_type as any,
          permission_type: input.permission_type as any,
        };
        const res = await this.mondayApi.request<UpdateAgentResourceAccessMutation>(
          updateAgentResourceAccessMutation,
          variables,
          { versionOverride: 'dev' },
        );
        return {
          content: {
            message: `Permission on ${input.scope_type} ${input.resource_id} updated to ${input.permission_type}.`,
            success: res.update_agent_resource_access?.success ?? false,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'update resource access for monday platform agent');
      }
    }

    try {
      const variables: RemoveAgentResourceAccessMutationVariables = {
        id: input.agent_id,
        resource_id: input.resource_id,
        scope_type: input.scope_type as any,
      };
      const res = await this.mondayApi.request<RemoveAgentResourceAccessMutation>(
        removeAgentResourceAccessMutation,
        variables,
        { versionOverride: 'dev' },
      );
      return {
        content: {
          message: `Access to ${input.scope_type} ${input.resource_id} removed from agent.`,
          success: res.remove_agent_resource_access?.success ?? false,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'remove resource access from monday platform agent');
    }
  }
}
```

- [ ] **Step 4: Register the tool**

In `src/core/tools/platform-api-tools/agents-tools/index.ts`, add:
```typescript
export * from './manage-agent-knowledge/manage-agent-knowledge-tool';
```

In `src/core/tools/platform-api-tools/index.ts`, add import:
```typescript
import { ManageAgentKnowledgeTool } from './agents-tools/manage-agent-knowledge/manage-agent-knowledge-tool';
```

Add to `allGraphqlApiTools` array:
```typescript
  ManageAgentKnowledgeTool,
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/agent-toolkit && npx jest src/core/tools/platform-api-tools/agents-tools/manage-agent-knowledge --no-coverage 2>&1 | tail -10
```

Expected: PASS — all 10 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/core/tools/platform-api-tools/agents-tools/
git add src/core/tools/platform-api-tools/index.ts
git commit -m "feat(agent-toolkit): add manage_agent_knowledge tool"
```

---

## Task 10: Full test suite and build

- [ ] **Step 1: Run all agents-tools tests**

```bash
cd packages/agent-toolkit && npx jest src/core/tools/platform-api-tools/agents-tools --no-coverage 2>&1 | tail -20
```

Expected: all 9 test suites pass (3 existing + 6 new).

- [ ] **Step 2: Run full test suite**

```bash
cd packages/agent-toolkit && npm test 2>&1 | tail -20
```

Expected: all tests pass, no regressions.

- [ ] **Step 3: Build**

```bash
cd packages/agent-toolkit && npm run build 2>&1 | tail -10
```

Expected: exits 0, `dist/` updated with no TypeScript errors.

---

## Task 11: Bump version

- [ ] **Step 1: Bump version in `package.json`**

In `packages/agent-toolkit/package.json`, change:
```json
"version": "5.10.3"
```
to:
```json
"version": "5.11.0"
```

(Minor bump — new tools are additive, non-breaking.)

- [ ] **Step 2: Commit**

```bash
git add packages/agent-toolkit/package.json
git commit -m "chore(agent-toolkit): bump version to 5.11.0"
```

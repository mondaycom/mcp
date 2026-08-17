# Search Tool — Forward `boardIds` for BOARD and TIMELINE_ITEMS (PR 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Forward the caller-supplied `boardIds` argument to the GraphQL queries for `BOARD` and `TIMELINE_ITEMS` search, which currently ignore it.

**Architecture:** Purely additive. Add `$boardIds` to the two GraphQL query documents, thread the parameter through the async methods, and regenerate types. The schema already accepts `board_ids` on both endpoints — no server-side changes needed.

**Tech Stack:** TypeScript, `graphql-request`, Zod, `graphql-codegen`.

**Spec:** `monday-agents-platform` repo, feature spec (in linked PR description).

## Global Constraints

- All paths relative to `packages/agent-toolkit/` in `~/Development/mcp`.
- Run `yarn codegen` (not `yarn generate`) to regenerate types — reads the local schema file, no network call needed.
- **Do not edit** the generated file `src/monday-graphql/generated/graphql/graphql.ts` by hand — it is overwritten by codegen.
- LangChain version locked (irrelevant here but noted for context — do not bump any deps).
- Quality gate: `yarn lint && yarn build && yarn test` from `packages/agent-toolkit/`.

---

### Task 1: Forward `boardIds` in the GraphQL query documents

**Files:**
- Modify: `src/core/tools/platform-api-tools/search-tool/search-tool.graphql.ts`

**Interfaces:**
- Consumes: Nothing new.
- Produces: Updated `searchBoards` and `searchTimelineItems` gql fragments that include `$boardIds: [ID!]` and `board_ids: $boardIds`.

- [ ] **Step 1: Read the file to understand current state**

```bash
cat packages/agent-toolkit/src/core/tools/platform-api-tools/search-tool/search-tool.graphql.ts
```

- [ ] **Step 2: Edit `searchBoards` to accept and forward `boardIds`**

Change the `searchBoards` export from:
```graphql
export const searchBoards = gql`
  query SearchBoards($query: String!, $limit: Int, $workspaceIds: [ID!]) {
    search {
      boards(query: $query, limit: $limit, workspace_ids: $workspaceIds) {
```
to:
```graphql
export const searchBoards = gql`
  query SearchBoards($query: String!, $limit: Int, $workspaceIds: [ID!], $boardIds: [ID!]) {
    search {
      boards(query: $query, limit: $limit, workspace_ids: $workspaceIds, board_ids: $boardIds) {
```

- [ ] **Step 3: Edit `searchTimelineItems` to accept and forward `boardIds`**

Change the `searchTimelineItems` export from:
```graphql
export const searchTimelineItems = gql`
  query SearchTimelineItems($query: String!, $limit: Int) {
    search {
      timeline_items(query: $query, limit: $limit) {
```
to:
```graphql
export const searchTimelineItems = gql`
  query SearchTimelineItems($query: String!, $limit: Int, $boardIds: [ID!]) {
    search {
      timeline_items(query: $query, limit: $limit, board_ids: $boardIds) {
```

- [ ] **Step 4: Regenerate TypeScript types**

```bash
cd ~/Development/mcp && yarn workspace @mondaycom/agent-toolkit codegen
```

Verify the generated file `src/monday-graphql/generated/graphql/graphql.ts` now has `boardIds` in `SearchBoardsQueryVariables` and `SearchTimelineItemsQueryVariables`. Quick check:

```bash
grep -n "SearchBoardsQueryVariables\|SearchTimelineItemsQueryVariables" packages/agent-toolkit/src/monday-graphql/generated/graphql/graphql.ts
```

Both should show a `boardIds` field.

- [ ] **Step 5: Commit the graphql and generated files**

```bash
cd ~/Development/mcp
git add packages/agent-toolkit/src/core/tools/platform-api-tools/search-tool/search-tool.graphql.ts
git add packages/agent-toolkit/src/monday-graphql/generated/graphql/graphql.ts
git commit -m "feat(search): add boardIds variable to searchBoards and searchTimelineItems queries"
```

---

### Task 2: Thread `boardIds` through the TypeScript methods and update copy

**Files:**
- Modify: `src/core/tools/platform-api-tools/search-tool/search-tool.ts`
- Test: `src/core/tools/platform-api-tools/search-tool/search-tool.test.ts`

**Interfaces:**
- Consumes: `SearchBoardsQueryVariables`, `SearchTimelineItemsQueryVariables` (now include `boardIds`) from Task 1.
- Produces:
  - `searchBoardsAsync(query, limit, workspaceIds?, boardIds?): Promise<SearchResult[]>`
  - `searchTimelineItemsAsync(query, limit, boardIds?): Promise<SearchResult[]>`

- [ ] **Step 1: Write the failing tests first**

In `search-tool.test.ts`, find the `BOARD` search handler section and add two tests after the existing ones:

```typescript
it('should pass boardIds to the searchBoards request', async () => {
  mockApiRequest.mockResolvedValueOnce({
    search: { boards: { results: [] } },
  });
  await tool.execute({ searchTerm: 'test', searchType: GlobalSearchType.BOARD, boardIds: [111, 222] });
  expect(mockApiRequest).toHaveBeenCalledWith(
    searchBoards,
    expect.objectContaining({ boardIds: ['111', '222'] }),
    expect.anything(),
  );
});

it('should send boardIds as undefined when not supplied for BOARD search', async () => {
  mockApiRequest.mockResolvedValueOnce({
    search: { boards: { results: [] } },
  });
  await tool.execute({ searchTerm: 'test', searchType: GlobalSearchType.BOARD });
  expect(mockApiRequest).toHaveBeenCalledWith(
    searchBoards,
    expect.objectContaining({ boardIds: undefined }),
    expect.anything(),
  );
});
```

And in the `TIMELINE_ITEMS` section, add:

```typescript
it('should pass boardIds to the searchTimelineItems request', async () => {
  mockApiRequest.mockResolvedValueOnce({
    search: { timeline_items: { results: [] } },
  });
  await tool.execute({ searchTerm: 'test', searchType: GlobalSearchType.TIMELINE_ITEMS, boardIds: [333] });
  expect(mockApiRequest).toHaveBeenCalledWith(
    searchTimelineItems,
    expect.objectContaining({ boardIds: ['333'] }),
    expect.anything(),
  );
});

it('should send boardIds as undefined when not supplied for TIMELINE_ITEMS search', async () => {
  mockApiRequest.mockResolvedValueOnce({
    search: { timeline_items: { results: [] } },
  });
  await tool.execute({ searchTerm: 'test', searchType: GlobalSearchType.TIMELINE_ITEMS });
  expect(mockApiRequest).toHaveBeenCalledWith(
    searchTimelineItems,
    expect.objectContaining({ boardIds: undefined }),
    expect.anything(),
  );
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd ~/Development/mcp && yarn workspace @mondaycom/agent-toolkit test --reporter=verbose 2>&1 | grep -E "FAIL|PASS|boardIds"
```

Expected: the four new tests FAIL (boardIds is not forwarded yet).

- [ ] **Step 3: Update `searchBoardsAsync` to accept and forward `boardIds`**

Change the signature and variables from:
```typescript
private async searchBoardsAsync(query: string, limit: number, workspaceIds?: string[]): Promise<SearchResult[]> {
  const variables: SearchBoardsQueryVariables = { query, limit, workspaceIds };
```
to:
```typescript
private async searchBoardsAsync(query: string, limit: number, workspaceIds?: string[], boardIds?: string[]): Promise<SearchResult[]> {
  const variables: SearchBoardsQueryVariables = { query, limit, workspaceIds, boardIds };
```

- [ ] **Step 4: Update `searchTimelineItemsAsync` to accept and forward `boardIds`**

Change the signature and variables from:
```typescript
private async searchTimelineItemsAsync(query: string, limit: number): Promise<SearchResult[]> {
  const variables: SearchTimelineItemsQueryVariables = { query, limit };
```
to:
```typescript
private async searchTimelineItemsAsync(query: string, limit: number, boardIds?: string[]): Promise<SearchResult[]> {
  const variables: SearchTimelineItemsQueryVariables = { query, limit, boardIds };
```

- [ ] **Step 5: Thread `boardIds` through `runSmartSearchAsync` for BOARD and TIMELINE_ITEMS**

In `runSmartSearchAsync`, the `BOARD` branch currently is:
```typescript
if (input.searchType === GlobalSearchType.BOARD) {
  return this.searchBoardsAsync(searchTerm, input.limit, workspaceIds);
}
```

Change to (mirror the UPDATES branch pattern with `toFilterIds`):
```typescript
if (input.searchType === GlobalSearchType.BOARD) {
  const boardIds = toFilterIds(input.boardIds?.map((id) => id.toString()));
  return this.searchBoardsAsync(searchTerm, input.limit, workspaceIds, boardIds);
}
```

The `TIMELINE_ITEMS` branch currently is:
```typescript
if (input.searchType === GlobalSearchType.TIMELINE_ITEMS) {
  return this.searchTimelineItemsAsync(searchTerm, input.limit);
}
```

Change to:
```typescript
if (input.searchType === GlobalSearchType.TIMELINE_ITEMS) {
  const boardIds = toFilterIds(input.boardIds?.map((id) => id.toString()));
  return this.searchTimelineItemsAsync(searchTerm, input.limit, boardIds);
}
```

- [ ] **Step 6: Update the `boardIds` field description**

In `searchSchema`, the `boardIds` field currently reads:
```
'Array of board IDs (numbers) to scope the search to. Applies to ITEMS and UPDATES search, and only pass it if the user explicitly asked to search within specific boards. Example: [12345, 67890].'
```

Change to:
```
'Array of board IDs (numbers) to scope the search to. Applies to BOARD, ITEMS, UPDATES, and TIMELINE_ITEMS search. Only pass it if the user explicitly asked to search within specific boards. Example: [12345, 67890].'
```

- [ ] **Step 7: Update `getDescription()` for BOARD and TIMELINE_ITEMS**

In the `getDescription()` return string:

Change:
```
BOARD search returns id, title, url, and workspaceId.
```
to:
```
BOARD search returns id, title, url, and workspaceId. Optionally scope it with boardIds.
```

Change:
```
TIMELINE_ITEMS search returns id, title, summary, content, itemId, and boardId.
```
to:
```
TIMELINE_ITEMS search returns id, title, summary, content, itemId, and boardId. Optionally scope it with boardIds.
```

- [ ] **Step 8: Run the tests to confirm they pass**

```bash
cd ~/Development/mcp && yarn workspace @mondaycom/agent-toolkit test --reporter=verbose 2>&1 | grep -E "FAIL|PASS|boardIds"
```

Expected: all four new tests PASS, and no existing tests fail.

- [ ] **Step 9: Run the full quality gate**

```bash
cd ~/Development/mcp && yarn workspace @mondaycom/agent-toolkit lint && yarn workspace @mondaycom/agent-toolkit build && yarn workspace @mondaycom/agent-toolkit test
```

All must pass.

- [ ] **Step 10: Commit**

```bash
cd ~/Development/mcp
git add packages/agent-toolkit/src/core/tools/platform-api-tools/search-tool/search-tool.ts
git add packages/agent-toolkit/src/core/tools/platform-api-tools/search-tool/search-tool.test.ts
git commit -m "feat(search): forward boardIds for BOARD and TIMELINE_ITEMS search types"
```

---

## Self-review checklist

- [x] Spec: `searchBoards` gets `$boardIds` — Task 1 ✓
- [x] Spec: `searchTimelineItems` gets `$boardIds` — Task 1 ✓
- [x] Spec: codegen re-run — Task 1, Step 4 ✓
- [x] Spec: `searchBoardsAsync` parameter updated — Task 2, Step 3 ✓
- [x] Spec: `searchTimelineItemsAsync` parameter updated — Task 2, Step 4 ✓
- [x] Spec: `runSmartSearchAsync` BOARD branch passes boardIds — Task 2, Step 5 ✓
- [x] Spec: `runSmartSearchAsync` TIMELINE_ITEMS branch passes boardIds — Task 2, Step 5 ✓
- [x] Spec: `boardIds` description updated to name all four types — Task 2, Step 6 ✓
- [x] Spec: `getDescription()` BOARD and TIMELINE_ITEMS mention boardIds — Task 2, Step 7 ✓
- [x] Spec: tests assert board_ids reaches request variables — Task 2, Steps 1–2 ✓
- [x] Spec: omitting boardIds still sends `undefined` (no filter) — Task 2, Steps 1–2 ✓

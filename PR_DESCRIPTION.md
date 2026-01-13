## Add Filter Support to show-table UI Tool

### What
Enables agents to display filtered board data in the MCP UI table view.

**Example prompt:** "Show me my done tasks from last week on board X"

### Flow
1. Agent calls `get_board_info` to learn column IDs and filter syntax
2. Agent calls `show-table` with `boardId` and `filters`
3. `show-table` internally calls `get_full_board_data` with filters
4. Filtered data renders in the interactive table UI

### Changes

**mcp repo (agent-toolkit):**
- Extract filter schema to `get-board-items-page-tool/schema.ts`
- Add `$queryParams` to `full-board-data.graphql.ts`
- Update `full-board-data-tool.ts` to accept and apply filters

**hosted-mcp repo:**
- Update `show-table` to accept filters and pass to `get_full_board_data`
- Add precondition in description for `get_board_info`

### Backward Compatible
All changes are additive. Existing calls without filters work unchanged.


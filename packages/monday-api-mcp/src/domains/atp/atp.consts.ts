export const ATP_SERVER_NAME = 'monday.com';
export const ATP_SERVER_VERSION = '1.0.0';

export const MONDAY_API_BASE_URL = 'https://api.monday.com/v2';
export const MONDAY_API_NAME = 'monday';
export const DEFAULT_API_VERSION = '2025-10';
export const QUERY_DEPTH_LIMIT = 2;

export const getMondaySchemaUrl = (version: string = DEFAULT_API_VERSION): string =>
  `https://api.monday.com/v2/get_schema?version=${version}&format=sdl`;

export const TOOL_DESCRIPTIONS = {
  execute_code: `Execute Javascript code to call Monday.com APIs. MUST use 'return' to see results.

**API Pattern:** api.monday.query_xxx() for reads, api.monday.mutation_xxx() for writes.

**Critical Rules:**
- Use _fields parameter for nested data: 'id,name,columns{id,title,type},items_page{cursor}'
- ColumnValue has: id, type, text, value (NOT "title")
- items_page returns ~25 items - use pagination for more
- When searching/filtering, use the FULL value provided by the user (e.g., full name, not partial)

**When Unsure - ASK THE USER:**
- If you're not 100% sure about the user's intent, ASK before executing
- If multiple results match a search, ASK which one they mean
- If you're missing required information - ASK, don't guess

**CRITICAL - Multiple Results Handling:**
- When searching by name, ALWAYS check if multiple results match
- If more than one result is found and the user asked for a SPECIFIC entity (not "all" or "every"), STOP and ASK which one they mean
- Present the options clearly with distinguishing details (ID, relevant properties, etc.)
- Only proceed with the action AFTER the user confirms which one(s)
- Exception: If user explicitly says "all", "every", "both", etc., then apply to all matches

**NEVER GUESS - STRICT RULES:**
- NEVER pick "the first one" or any arbitrary result when multiple matches exist
- NEVER assume which entity the user meant - even if one seems "more likely"
- NEVER perform write operations (mutations) without explicit user confirmation when ambiguous
- If you find 2+ matches: DO NOT execute the action, LIST all matches with their IDs and details, WAIT for user to specify
- Saying "I updated the first one, let me know if you meant the other" is WRONG - you should have asked FIRST

**Multi-line Example:**
\`\`\`typescript
// 1. Get board with columns and cursor
const boards = await api.monday.query_boards({ 
  ids: ['BOARD_ID'],
  _fields: 'id,columns{id,title,type},items_page{cursor}'
});
const board = boards[0];

// 2. Find column by title
const statusCol = board.columns.find(c => c.title === 'Status')?.id;

// 3. Paginate items
let cursor = board.items_page.cursor;
const allItems = [];
for (let page = 0; page < 20; page++) {
  if (!cursor) break;
  const result = await api.monday.query_next_items_page({ 
    cursor, limit: 100,
    _fields: 'cursor,items{id,name,group{title},column_values{id,text}}'
  });
  allItems.push(...result.items);
  cursor = result.cursor;
}

// 4. Analyze and return
return { total: allItems.length, items: allItems.slice(0, 5) };
\`\`\`

Use AFTER exploring the API to understand available operations.`,

  explore_api: `Explore Monday.com API structure using filesystem-like navigation. ALWAYS use this BEFORE writing code to discover available operations and parameters.

**Navigation Paths:**
- "/monday/query" - List all query operations (read data)
- "/monday/mutation" - List all mutation operations (write data)  
- "/monday/query/boards" - See parameters for boards query
- "/monday/query/items" - See parameters for items query

**Valid Exploration Pattern:**
2. Then: path="/monday/query" to see query operations
3. Then: path="/monday/query/<operation_name>" to see parameters

**DO NOT explore nested paths like:**
- /monday/query/boards/items_page (doesn't exist)
- /monday/query/boards/fields (doesn't exist)

Only explore: /monday/query, /monday/mutation, or /monday/query/<operation_name>

**Example Workflow:**
1. explore_api path="/monday/query" → discover "boards", "items", "users" operations  
2. explore_api path="/monday/query/boards" → see ids, _fields parameters
3. YOU MUST USE THE EXPLORE_API TOOL TO DISCOVER THE OPERATIONS AND PARAMETERS BEFORE USING THE EXECUTE_CODE TOOL
4. NOW write code using execute_code with discovered operations
5. TRY TO MAKE ALL CODE EXECUTION IN ONE SCRIPT INSTEAD OF MULTIPLE ONES (IF POSSIBLE)

**IMPORTANT - When Unsure, ASK:**
- If you don't understand what the user wants - ASK
- If you're missing required information - ASK
- Don't guess or assume - it's better to ask than to make mistakes`,
} as const;

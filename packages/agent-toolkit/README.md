# @mondaydotcomorg/agent-toolkit

A powerful toolkit for building AI agents that interact with the monday.com API. This package provides a set of tools and utilities to help you create AI-powered integrations with monday.com through Model Context Protocol (MCP) implementation.

## Installation

```bash
npm install @mondaydotcomorg/agent-toolkit
```

## Subpath Exports

The package provides several modular components that can be imported separately:

- `@mondaydotcomorg/agent-toolkit/mcp` - MCP server implementation
- `@mondaydotcomorg/agent-toolkit/core` - Core utilities and base classes
- `@mondaydotcomorg/agent-toolkit/openai` - OpenAI integration

## Available Tools

The toolkit includes several pre-built tools for common monday.com operations, organized by functionality:

### Item Operations
- `CreateItemTool` - Create a new item in a monday.com board
- `DeleteItemTool` - Delete an item from a board
- `GetBoardItemsTool` - Get items by board id and term
- `CreateUpdateTool` - Create a new update on a specific item
- `ChangeItemColumnValuesTool` - Change the column values of an item in a monday.com board
- `MoveItemToGroupTool` - Move an item to a group in a monday.com board

### Board Operations
- `CreateBoardTool` - Create a monday.com board
- `GetBoardSchemaTool` - Get board schema (columns and groups) by board id
- `CreateGroupTool` - Create a new group in a monday.com board
- `CreateColumnTool` - Create a new column in a monday.com board
- `DeleteColumnTool` - Delete a column from a monday.com board

### WorkForms Operations
- `CreateFormTool` - Create a monday.com form
- `GetFormTool` - Get a form by its token, found in the form's URL

### Account Operations
- `GetUsersTool` - Get users, can be filtered by name or partial name
- `ListUsersAndTeams` - Get users or teams, either by ids, names or by searching the account

### Dynamic API Tools
- `AllMondayApiTool` - Execute any monday.com API operation by generating GraphQL queries and mutations dynamically
- `GetGraphQLSchemaTool` - Fetch the monday.com GraphQL schema structure including query and mutation definitions
- `GetTypeDetailsTool` - Get detailed information about a specific GraphQL type from the monday.com API schema

## Usage

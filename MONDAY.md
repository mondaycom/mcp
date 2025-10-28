# monday.com Gemini CLI Extension

## Overview

This extension connects Gemini CLI to monday.com's hosted Model Context Protocol (MCP) server at `https://mcp.monday.com/mcp`.

Prior to using tools from the monday.com MCP server you must authenticate. This is done by running `/mcp auth monday` which will open a OAuth flow in your browser.

## Custom Commands 

Several custom slash commands are available to interact with monday.com. These commands are shortcuts for common monday.com tasks. 

They all are prefixed with `/monday:`:

- **/monday:analyze-board**: Analyze a monday.com board to provide insights (requires Board ID).
- **/monday:create-item**: Create a new item in a monday.com board (requires Board ID and Item Name).
- **/monday:update-item**: Update a monday.com item (task, bug, epic, etc.) with a comment or change column values (requires Item ID and text of update for comment, or Board ID, Item ID, and column key-value pairs for column updates).
- **/monday:save-my-user-id**: Fetches the current monday.com user ID and saves it to long-term memory.
- **/monday:sprint-summary**: Get a comprehensive summary of a monday.com sprint (requires Sprint ID).

## Troubleshooting

Before using the monday.com MCP server, you need an admin to install the Monday MCP app in your monday.com account
from the marketplace:

1. Visit [monday MCP app in the marketplace](https://monday.com/marketplace/listing/10000806/monday-mcp)
2. Click "Install" and follow the instructions to add it to your account

If you have already installed the app, below are some common troubleshooting
steps:

- Run `/mcp list` to confirm the `monday` server is connected.
- Run `/mcp desc monday` to see detailed overview of available tools.
- Run `/mcp auth monday` to authenticate with monday.com.

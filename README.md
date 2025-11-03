<div align="center">

# 🚀 monday.com MCP

<p>
  <a href="https://npmjs.com/package/@mondaydotcomorg/monday-api-mcp"><img src="https://img.shields.io/npm/v/@mondaydotcomorg/monday-api-mcp.svg?style=flat" alt="npm version"></a>
  <a href="https://github.com/mondaycom/mcp/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://github.com/mondaycom/mcp"><img src="https://img.shields.io/github/stars/mondaycom/mcp.svg?style=social" alt="GitHub Stars"></a>
  <img src="https://img.shields.io/badge/Node.js-v20+-green.svg" alt="Node.js Version">
  <img src="https://img.shields.io/badge/MCP-Compatible-blueviolet" alt="MCP Compatible">
  <img src="https://img.shields.io/badge/Claude-Ready-orange" alt="Claude Ready">
  <img src="https://img.shields.io/badge/OpenAI-Compatible-lightgrey" alt="OpenAI Compatible">
  <img src="https://img.shields.io/badge/TypeScript-Powered-blue" alt="TypeScript">
</p>

**Enable AI agents to operate reliably within real workflows. This MCP is monday.com's open framework for connecting agents into your work OS - giving them secure access to structured data, tools to take action, and the context needed to make smart decisions.**

</div>

## 🌟 Overview

This repository, maintained by the monday.com AI team, provides a comprehensive set of tools for AI agent developers who want to integrate with monday.com. Whether you're building AI assistants, automations, or custom integrations, our tools make it easy to connect to the monday.com platform.

<https://github.com/user-attachments/assets/ed8d24e1-256b-4f6b-9d84-38e54a8703fd>

## 🔑 What is monday.com?

[monday.com](https://monday.com) is a work operating system that powers teams to run processes, projects, and everyday work. Teams use monday.com to plan, track, and manage their work in one centralized platform. It provides a visual, intuitive interface where teams can:

- Create and manage projects with customizable boards
- Track tasks through different stages with status columns
- Collaborate with team members through updates and mentions
- Automate workflows and integrate with other tools
- Visualize data with dashboards and reports

## 📦 What's Inside

### 💻 monday API MCP Server

The `@mondaydotcomorg/monday-api-mcp` package provides a plug-and-play server implementation for the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). It allows AI agents to interact with the monday.com API without needing to build complex integrations.

### 🤖 Agent Toolkit

The `@mondaydotcomorg/agent-toolkit` package provides a powerful set of tools and utilities for building AI agents that interact with the monday.com API, supporting both OpenAI and Model Context Protocol (MCP) implementations.

## 🏁 Complete Installation Guide

### Step 1: Create a monday.com Account

If you don't already have a monday.com account:

1. Go to [monday.com](https://monday.com) and sign up for an account
2. Create your first workspace and board to get started

### Step 2: Generate an API Token

To interact with monday.com's API, you'll need an API token:

1. Log in to your monday.com account
2. Click on your avatar in the bottom-left corner
3. Select "Developers"
4. Click "My access tokens" on the left menu
5. Copy your personal access token

### Step 3: Configure Your MCP Client

#### For Claude Desktop

1. Open Claude Desktop
2. Go to Settings → MCP Servers
3. Add a new server with this configuration:

```json
{
  "mcpServers": {
    "monday-api-mcp": {
      "command": "npx",
      "args": [
        "@mondaydotcomorg/monday-api-mcp@latest",
        "-t",
        "your_monday_api_token"
      ]
    }
  }
}
```

#### For Gemini CLI

To get started with [Gemini CLI](https://geminicli.com), you can use the
official [Gemini CLI extension](https://geminicli.com/extensions) for
monday.com.

The Gemini CLI extension bundles the monday.com MCP server with a context file
and custom commands that teaches Gemini how to use the monday.com tools for
powerful workflows.

To install the extension run the following command in your terminal:

```sh
gemini extensions install https://github.com/mondaycom/mcp
```

If you prefer to use the MCP server directly without the extension, you can add
it with this command:

```sh
gemini mcp add -t http monday https://mcp.monday.com/mcp
```

Once you have either the extension installed or the MCP server added, start
Gemini CLI by running:

```sh
gemini
```

Then, authenticate with your monday.com account by running the following
command inside Gemini CLI:

```sh
/mcp auth monday
```

This will open a browser window to complete the authentication process.
After authenticating, all the monday.com tools and custom commands will
be available.

A few custom command to try out for the extension:

- `/monday:create-item` create item in board 123 for "Update the UI"
- `/monday:sprint-summary` sprint summary for sprint 853

#### For Cursor or Other MCP Clients

Add to your settings:

```json
{
  "mcpServers": {
    "monday-api-mcp": {
      "command": "npx",
      "args": [
        "@mondaydotcomorg/monday-api-mcp@latest",
        "-t",
        "your_monday_api_token"
      ],
      "env": {}
    }
  }
}
```

### Step 5: Test Your Integration

1. Ask Claude or your AI assistant a question like:
   - "What items do I have in board 123?"
   - "Can you create a board to manage my project?"

2. Your assistant should now be able to interact with your monday.com account!

## 🌩️ Using the Hosted MCP Service

### Option 1: Using OAuth

Instead of running the MCP server locally, you can use monday.com's hosted MCP service for a simpler setup.

#### Step 1: Install the Monday MCP App

Before using the hosted service, you need to install the Monday MCP app from the marketplace:

1. Visit [monday MCP app in the marketplace](https://monday.com/marketplace/listing/10000806/monday-mcp)
2. Click "Install" and follow the instructions to add it to your account

#### Step 2: Configure Your MCP Client for the Hosted Service

Add this configuration to your MCP client settings:

```json
{
  "mcpServers": {
    "monday-api-mcp-hosted": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.monday.com/sse",
      ],
    }
  }
}
```

### Option 2: Using Authorization header

To specify an authorization header and API version:

```json
{
  "mcpServers": {
    "monday-api-mcp-hosted-dev": {
      "command": "npx",
      "args": [
        "-p",
        "node@20",
        "mcp-remote",
        "https://mcp.monday.com/sse",
        "--header",
        "Authorization:${AUTH_HEADER}",
      ],
      "env": {
        "AUTH_HEADER": "Bearer <your_token>",
      }
    }
  }
}
```

### Additional Configuration for Hosted MCP

You can specify the Api version you want to use using the **--header** param:

```json
{
  "mcpServers": {
    "monday-api-mcp-hosted": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.monday.com/sse",
        "--header",
        "Api-Version:${API_VERSION}"
      ],
      "env": {
        "API_VERSION": "2025-07"
      }
    }
  }
}
```

### Benefits of the Hosted Service

- No need to manage your own server
- Automatic updates with the latest features
- Improved reliability and performance
- Instead of adding the token yourself, our OAuth mechanism takes control of it
- You can limit the mcp to work on specific workspaces

## 🧰 Available Tools

Our MCP server provides a rich set of tools that give AI assistants the ability to interact with monday.com:

| Category | Tool | Description |
|----------|------|-------------|
| **Item Operations** | create_item | Create a new item in a monday.com board with specified column values |
| | delete_item | Delete an item from a board permanently |
| | get_board_items_by_name | Search for items by board ID and term/name |
| | create_update | Add an update/comment to a specific item |
| | change_item_column_values | Modify the column values of an existing item |
| | move_item_to_group | Move an item to a different group within the same board |
| **Board Operations** | create_board | Create a new monday.com board with specified columns |
| | get_board_schema | Retrieve the structure of columns and groups for a board |
| | create_group | Create a new group in a monday.com board |
| | create_column | Add a new column to an existing board |
| | delete_column | Remove a column from a board |
| **Account Operations** | list_users_and_teams | Retrieve user or team's details by id, name or by searching the account |
| **WorkForms Operations** | create_form | Create a new monday.com form |
| | get_form | Get a form by its token |

## 🔮 Dynamic API Tools (Beta)

Our Dynamic API Tools feature represents a significant advancement in how AI agents can interact with monday.com. While our standard tools cover common operations, Dynamic API Tools unlock the **full potential** of the monday.com GraphQL API.

### What are Dynamic API Tools?

Dynamic API Tools provide AI agents with complete, adaptable access to monday.com's entire API surface. This means your AI assistant can:

1. **Access any API endpoint** - Not just the predefined operations we've built
2. **Generate custom GraphQL queries** - Create exactly the query needed for any situation
3. **Dynamically explore monday.com's schema** - Understand all available data types and their relationships

### Key Dynamic API Tools

| Tool | Description |
|------|-------------|
| all_monday_api | Generate and execute any GraphQL query or mutation dynamically |
| get_graphql_schema | Fetch monday.com's GraphQL schema to understand available operations |
| get_type_details | Retrieve detailed information about specific GraphQL types |

### Unlocked Possibilities

With Dynamic API Tools, your AI assistants can:

- **Create complex reports** spanning multiple boards, items, and data points
- **Perform batch operations** across many items simultaneously
- **Integrate deeply** with monday.com's advanced features like docs, workspaces, and activity logs
- **Discover new capabilities** as monday.com adds features to their API

### How to Enable

Dynamic API Tools are in beta and disabled by default. Enable them with:

```bash
npx @mondaydotcomorg/monday-api-mcp@latest -t your_token --enable-dynamic-api-tools true
```

You can also use the 'only' mode to exclusively enable Dynamic API Tools:

```bash
npx @mondaydotcomorg/monday-api-mcp@latest -t your_token --enable-dynamic-api-tools only
```

When 'only' mode is enabled, the server will provide just the Dynamic API Tools, filtering out all other standard tools. This is useful for advanced users who want to work directly with the GraphQL API.

> ⚠️ **Note**: Dynamic API Tools require full API access and are not compatible with read-only mode.

## 🖥️ MCP Server Configuration

| Argument | Flags | Description | Required | Default |
|----------|-------|-------------|----------|---------|
| monday.com API Token | `--token`, `-t` | monday.com API token | Yes | - |
| API Version | `--version`, `-v` | monday.com API version | No | `current` |
| Read Only Mode | `--read-only`, `-ro` | Enable read-only mode | No | `false` |
| Dynamic API Tools | `--enable-dynamic-api-tools`, `-edat` | Enable dynamic API tools | No | `false` |

## 🔐 Authentication & Security

The server requires a monday.com API token to authenticate with the monday.com API. You can provide this token in two ways:

1. Command line argument: `-t your_monday_api_token`
2. Environment variable: `monday_token=your_monday_api_token`

### Security Best Practices

- **Never share your API token** in public repositories or discussions
- Consider using **read-only mode** (`--read-only`) when you only need to retrieve data
- **Regularly rotate** your API tokens for enhanced security

## 📚 Example Use Cases

Here are some examples of what you can build with our tools:

### 1. AI Assistant for Project Management

- Create and manage tasks in monday.com boards
- Get updates on project status
- Move items between groups as they progress

### 2. Data Analysis & Reporting

- Extract data from monday.com boards
- Generate reports and insights
- Create new boards for reporting

## 🌐 Community & Support

- **GitHub Issues**: For bug reports and feature requests
- **Discussions**: For questions and community discussions
- **[monday.com Developer Documentation](https://developer.monday.com/api-reference/docs)**: Learn more about the monday.com API

## 📚 Documentation

- [monday API MCP Documentation](./packages/monday-api-mcp/README.md)
- [Agent Toolkit Documentation](./packages/agent-toolkit/README.md)
- [monday.com API Reference](https://developer.monday.com/api-reference/docs)

## 📋 Prerequisites

Before using these tools, make sure you have:

1. Node.js v20 or higher installed
2. NPM v5.2.0 or higher installed
3. A [monday.com API token](https://developer.monday.com/api-reference/docs/authentication)

## 🛠️ How to develop in the repo

To develop for the repo:

1. Clone the repository
2. Install dependencies: `yarn install`
3. Build the project: `yarn build`
4. Copy the path of the dist/index.js file in the of the `monday-api-mcp` package.
5. Change the config to work locally

```bash
    "monday-api-mcp": {
      "command": "node",
      "args": [
        "<your_full_path_to_the_package>/dist/index.js",
        "-t",
        "123",
        "--enable-dynamic-api-tools",
        "true"
      ],
      "env": {}
    }
```

## 🤝 Contributing

We welcome contributions from the community! Whether it's fixing bugs, improving documentation, or adding new features, your help is appreciated.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

It is clarified that the server uses the monday.com API, which is subject to monday.com's [Developer Terms](https://monday.com/l/marketplace-developers/developer-terms/)

---

<div align="center">
  <p>Built with ❤️ by the monday.com AI Team</p>
  <p>
    <a href="https://monday.com">monday.com</a> |
    <a href="https://developer.monday.com">Developer Platform</a> |
    <a href="https://github.com/mondaycom/mcp">GitHub</a>
  </p>
</div>

<div align="center" id="top">

# monday.com API MCP Server

</div>

A server implementation for the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) that provides an interface to interact with monday.com API.

## 💻 Claude Desktop Demo

https://github.com/user-attachments/assets/ed8d24e1-256b-4f6b-9d84-38e54a8703fd

## Prerequisites

Before running the MCP server, make sure you have:

1. Node v20 or higher installed
2. NPM v5.2.0 or higher installed
3. [monday.com API key](https://developer.monday.com/api-reference/docs/authentication)

## ⚙️ Usage

```bash
npx @mondaydotcomorg/monday-api-mcp -t abcd123
```

The monday.com API token can also be provided via the `monday_token` environment variable.

### Command Line Arguments

| Argument | Flags | Description | Required | Default |
|----------|-------|-------------|----------|---------|
| monday.com API Token | `--token`, `-t` | monday.com API token (can also be provided via `monday_token` environment variable) | Yes | - |
| API Version | `--version`, `-v` | monday.com API version | No | `current` |
| Read Only Mode | `--read-only`, `-ro` | Enable read-only mode | No | `false` |
| Dynamic API Tools | `--enable-dynamic-api-tools`, `-edat` | (Beta) Enable dynamic API tools (Mode that includes the whole API schema, not supported when using read-only mode) | No | `false` |

## 💻 Claude Desktop Integration

```json
{
  "mcpServers": {
    "monday-api-mcp": {
      "command": "npx",
      "args": [
        "@mondaydotcomorg/monday-api-mcp",
        "-t",
        "abcd123"
      ]
    }
  }
}
```

## 💻 Cursor Integration

### Using command line arguments

```json
{
  "mcpServers": {
    "monday-api-mcp": {
      "command": "npx",
      "args": [
        "@mondaydotcomorg/monday-api-mcp",
        "-t",
        "abcd123"
      ],
      "env": {}
    }
  }
}
```

### Using environment variable

```json
{
  "mcpServers": {
    "monday-api-mcp": {
      "command": "npx",
      "args": [
        "@mondaydotcomorg/monday-api-mcp"
      ],
      "env": {
        "monday_token": "abcd123"
      }
    }
  }
}
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

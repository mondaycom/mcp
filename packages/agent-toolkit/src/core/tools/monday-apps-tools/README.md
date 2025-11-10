# 🎨 monday.com Apps Framework Tools

The Apps Framework Tools provide AI agents with complete access to monday.com's app development platform. These tools enable you to build, manage, and deploy custom monday.com apps directly through AI assistants.

## What is the monday.com Apps Framework?

The [monday.com Apps Framework](https://developer.monday.com/apps/docs) allows developers to build custom applications that extend monday.com's functionality. With these tools, AI agents can:

- **Create and manage apps** - Build new apps or modify existing ones
- **Configure app features** - Add custom views, columns, widgets, and integrations
- **Manage app versions** - Control version lifecycle and promotions
- **Deploy to monday-code** - Manage serverless backend deployments
- **Handle app storage** - Query and manage app data storage

## How to Enable Apps Framework Tools

To enable the Apps Framework tools, add the `--mode apps` flag to your MCP configuration:

### For Cursor or Local MCP Setup

```json
{
  "mcpServers": {
    "monday-api-mcp-apps": {
      "command": "npx",
      "args": [
        "@mondaydotcomorg/monday-api-mcp@latest",
        "-t",
        "your_monday_api_token",
        "--mode",
        "apps"
      ]
    }
  }
}
```

## Available Apps Framework Tools

| Category | Tool | Description |
|----------|------|-------------|
| **App Management** | get_all_apps | Retrieve all the development apps that the user has collaboration permissions for |
| | create_app | Create a new monday.com  app with basic information (name and optional description) |
| | create_app_from_manifest | Create a new monday.com  app from a manifest file |
| | promote_app | Promote a specific app version to live/production status |
| **App Versions** | get_app_versions | Retrieve all versions of a specific app |
| | get_app_version | Retrieve detailed data for a specific app version by version ID |
| **App Features** | get_app_features | Retrieve all features (views, columns, integrations, etc.) for a specific app version |
| | create_app_feature | Create a new feature for a specific app version (custom columns, board views, widgets, etc.) |
| **monday-code Deployment** | get_deployment_status | Get the deployment status for a specific app version in monday-code |
| | set_environment_variable | Set or update an environment variable for an app's monday-code backend |
| **Storage Management** | search_storage_records | Search for storage records in an app by search term |
| | export_storage_data | Export all storage data from an app for a specific account |

## Example Use Cases

Here are some examples of what you can build with Apps Framework tools:

### 1. Build a Custom App

```
"Create a new monday.com app called 'Task Analyzer' that adds a custom status column to track task complexity"
```

### 2. Manage App Deployments

```
"Check the deployment status of my app version and set the API_KEY environment variable"
```

### 3. Query App Storage

```
"Search for all storage records in app 12345 for account 67890 containing 'user_preferences'"
```

### 4. Version Management

```
"Show me all versions of my app and promote the latest draft version to production"
```

## Prerequisites for Apps Framework Tools

To use the Apps Framework tools, you need:

1. A monday.com developer account with developer mode enabled
2. Familiarity with the [monday.com Apps Framework](https://developer.monday.com/apps/docs)

## Tool Categories

### App Management Tools

Tools for creating and managing monday.com apps at the top level.

- **get_all_apps**: List all apps you have access to
- **create_app**: Create a new app with basic configuration
- **create_app_from_manifest**: Create an app from a complete manifest file
- **promote_app**: Promote an app version to production

### App Version Tools

Tools for managing different versions of your apps.

- **get_app_versions**: List all versions of a specific app
- **get_app_version**: Get detailed information about a specific version

### App Feature Tools

Tools for adding and configuring app features like custom columns, views, and widgets.

- **get_app_features**: List all features in an app version
- **create_app_feature**: Add a new feature to an app version

Supported feature types include:
- `AppFeatureStatusColumn` - Custom status columns
- `AppFeatureBoardView` - Custom board views
- `AppFeatureItemView` - Custom item views
- `AppFeatureDashboardWidget` - Dashboard widgets
- `AppFeatureObject` - Custom objects
- And many more...

### monday-code Tools

Tools for managing your app's serverless backend deployment on monday-code.

- **get_deployment_status**: Monitor deployment progress and logs
- **set_environment_variable**: Configure runtime environment variables

### Storage Tools

Tools for querying and exporting data stored by your apps.

- **search_storage_records**: Find specific records in app storage
- **export_storage_data**: Export all storage data (JSON or CSV)

## Integration with Agent Toolkit

These tools are part of the `@mondaydotcomorg/agent-toolkit` package and can be used programmatically:

```typescript
import { allMondayAppsTools } from '@mondaydotcomorg/agent-toolkit';

// Use with your AI agent implementation
```

## Learn More

- [monday.com Apps Framework Documentation](https://developer.monday.com/apps)
- [monday-code Documentation](https://developer.monday.com/apps/docs/hosting-your-app-with-monday-code)
- [Vibe design system MCP](https://github.com/mondaycom/vibe/tree/master/packages/mcp) - Build monday.com-style UIs for your view app features with AI assistance

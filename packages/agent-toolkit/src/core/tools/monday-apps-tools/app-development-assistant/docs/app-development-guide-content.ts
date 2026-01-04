/**
 * App Development Guide Content
 * This file contains the documentation for building monday.com apps, split by topic.
 * Each section is a separate const for easy import and lookup.
 */

// =============================================================================
// OVERVIEW
// =============================================================================
export const OVERVIEW_CONTENT = `# monday.com App Development Complete Guide

## Overview

This guide provides comprehensive documentation for building, deploying, and maintaining monday.com apps. Use this as your reference for SDK usage, monday-code deployment, and best practices.

---`;

// =============================================================================
// QUICK START
// =============================================================================
export const QUICK_START_CONTENT = `## Quick Start

### Prerequisites

1. **Node.js 18+** - Required for development and deployment
2. **monday.com Developer Account** - Enable developer mode in your account settings
3. **monday CLI (mapps)** - Install globally: \`npm install -g @mondaycom/apps-cli\`

### Creating Your First App

\`\`\`bash
# Initialize a new app
mapps init

# Follow the interactive prompts:
# - Select app template (quickstart-react, quickstart-fullstack, etc.)
# - Enter app name
# - Choose features to include

# Navigate to your app directory
cd your-app-name

# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

### App Structure

\`\`\`
your-app/
├── src/
│   ├── App.tsx              # Main React component
│   ├── index.tsx            # Entry point
│   └── components/          # Your components
├── public/
│   └── index.html
├── package.json
├── monday.config.js         # monday.com app configuration
└── .env                     # Environment variables
\`\`\`

---`;

// =============================================================================
// OAUTH SCOPES
// =============================================================================
export const OAUTH_SCOPES_CONTENT = `## OAuth Scopes

OAuth scopes define what permissions your app has. **You must configure the correct scopes based on what your app does.** Users will see these permissions when installing your app.

### Available Scopes Reference

| Scope | Permission | When to Use |
|-------|------------|-------------|
| \`boards:read\` | Read board data | Reading items, columns, groups, board settings |
| \`boards:write\` | Modify board data | Creating/updating/deleting items, columns, groups |
| \`workspaces:read\` | Read workspace data | Listing workspaces, workspace settings |
| \`workspaces:write\` | Modify workspaces | Creating/updating workspaces |
| \`users:read\` | Read user information | Getting user profiles, listing team members |
| \`users:write\` | Modify user data | Updating user settings (admin only) |
| \`account:read\` | Read account information | Account settings, plan info |
| \`teams:read\` | Read team data | Listing teams, team members |
| \`teams:write\` | Modify teams | Creating/updating teams |
| \`tags:read\` | Read tags | Listing available tags |
| \`updates:read\` | Read item updates | Reading comments/updates on items |
| \`updates:write\` | Write item updates | Posting comments/updates to items |
| \`assets:read\` | Read file assets | Downloading files attached to items |
| \`webhooks:write\` | Manage webhooks | Creating/deleting webhook subscriptions |
| \`notifications:write\` | Send notifications | Sending notifications to users |
| \`docs:read\` | Read docs | Reading monday doc content |
| \`docs:write\` | Write docs | Creating/editing monday docs |

### Scope Selection Guide

**For Board Views:**
\`\`\`
Required: boards:read
Optional: boards:write (if modifying items), users:read (if showing user info)
\`\`\`

**For Item Views:**
\`\`\`
Required: boards:read
Optional: boards:write (if modifying item), updates:read/write (if showing/posting updates)
\`\`\`

**For Dashboard Widgets:**
\`\`\`
Required: boards:read (to query data from boards)
Optional: workspaces:read (if querying across workspace)
\`\`\`

**For Integrations/Automations:**
\`\`\`
Required: boards:read, boards:write (for most automations)
Optional: webhooks:write (for real-time triggers), notifications:write (to alert users)
\`\`\`

### Configuring Scopes

**Via Manifest (recommended):**
\`\`\`json
{
  "app": {
    "oauth": {
      "scopes": ["boards:read", "boards:write", "users:read"]
    }
  }
}
\`\`\`

**Via CLI:**
\`\`\`bash
# Export current manifest
mapps manifest:export -a <app_id> -i <version_id>

# Edit the manifest.json to add scopes
# Then import it back
mapps manifest:import -p ./manifest.json -a <app_id> -i <version_id>
\`\`\`

### Important Notes

1. **Request minimum scopes** - Only request what your app actually needs
2. **Scope changes require reinstall** - Users must reinstall to grant new permissions
3. **Check permissions at runtime** - Handle cases where users haven't granted all scopes
4. **Document your scopes** - Explain why each permission is needed in your app listing

---`;

// =============================================================================
// SDK REFERENCE
// =============================================================================
export const SDK_REFERENCE_CONTENT = `## monday.com SDK Reference

### Installation

\`\`\`bash
npm install @mondaydotcomorg/monday-sdk-js
\`\`\`

### Basic Usage

\`\`\`typescript
import mondaySdk from '@mondaydotcomorg/monday-sdk-js';

const monday = mondaySdk();

// Initialize the SDK
monday.setApiVersion('2026-01');
\`\`\`

### Core SDK Methods

#### 1. Context - Get App Context

\`\`\`typescript
// Get the current context (board, item, user info)
const context = await monday.get('context');

console.log(context.data);
// {
//   boardId: 12345,
//   itemId: 67890,
//   user: { id: '123', name: 'John' },
//   account: { id: '456' },
//   theme: 'light',
//   ...
// }
\`\`\`

#### 2. API - Execute GraphQL Queries

\`\`\`typescript
// Query boards
const response = await monday.api(\`
  query {
    boards(ids: [12345]) {
      id
      name
      items_page(limit: 50) {
        items {
          id
          name
          column_values {
            id
            text
            value
          }
        }
      }
    }
  }
\`);

// Mutation - Create item
const createItem = await monday.api(\`
  mutation {
    create_item(
      board_id: 12345,
      item_name: "New Task",
      column_values: "{\\"status\\": {\\"label\\": \\"Working on it\\"}}"
    ) {
      id
      name
    }
  }
\`);

// Mutation - Update column value
const updateColumn = await monday.api(\`
  mutation {
    change_column_value(
      board_id: 12345,
      item_id: 67890,
      column_id: "status",
      value: "{\\"label\\": \\"Done\\"}"
    ) {
      id
    }
  }
\`);
\`\`\`

#### 3. Storage - Persist App Data

monday.com provides persistent key-value storage with two scopes:

**Storage Limits:**
- Key length: **256 characters max**
- Value size: **6MB per key**

##### Instance Storage (Board Views, Item Views, Dashboard Widgets)

Use \`monday.storage.instance\` for data specific to each feature instance.
- Each board view, item view, or dashboard widget has **isolated storage**
- Compartmentalized by: \`accountId\` + \`app\` + \`instance\`
- **Resets when you release a new major version** (each version has its own instances)

\`\`\`typescript
// INSTANCE STORAGE - Scoped to the current feature instance

// Store instance-specific settings (e.g., board view config)
monday.storage.instance.setItem('view_config', JSON.stringify({
  columns: ['status', 'date', 'person'],
  sortBy: 'date',
  filterEnabled: true
})).then(res => {
  console.log(res.data); // { success: true, version: "465cc" }
});

// Retrieve instance settings
monday.storage.instance.getItem('view_config').then(res => {
  const config = JSON.parse(res.data.value);
  console.log(res.data.version); // Version identifier for concurrency
});

// Delete instance data
monday.storage.instance.deleteItem('view_config').then(res => {
  console.log(res.data); // { success: true, value: null }
});

// Dashboard Widget example
monday.storage.instance.setItem('widget_settings', JSON.stringify({
  chartType: 'bar',
  dataSource: 'board_123',
  refreshInterval: 60
}));
\`\`\`

##### Global Storage (App-Level)

Use \`monday.storage\` (without \`.instance\`) for app-wide data shared across all instances.
- Shared across **all app usages** (not tied to specific instances)
- Compartmentalized by: \`accountId\` + \`app\`
- **Does NOT reset between major versions**
- Supports \`searchItem\` for searching keys

\`\`\`typescript
// GLOBAL STORAGE - Shared across entire app

// Store app-level settings
monday.storage.setItem('app_config', JSON.stringify({
  apiEndpoint: 'https://api.example.com',
  featureFlags: { beta: true }
})).then(res => {
  console.log(res.data); // { success: true, version: "abc123" }
});

// Retrieve app-level data
monday.storage.getItem('app_config').then(res => {
  const config = JSON.parse(res.data.value);
});

// Search for keys (global storage only)
monday.storage.searchItem('user_').then(res => {
  console.log(res.data); // Returns matching keys
});

// Delete app-level data
monday.storage.deleteItem('app_config');

// Store user preferences at app level
monday.storage.setItem(\`user_\${userId}_prefs\`, JSON.stringify({
  theme: 'dark',
  notifications: true,
  language: 'en'
}));
\`\`\`

##### Versioning (Prevent Race Conditions)

Both storage types return a \`version\` identifier to handle concurrent writes:

\`\`\`typescript
// Use versioning to prevent overwrites from concurrent users
monday.storage.instance.getItem('shared_data').then(res => {
  const { value, version } = res.data;
  
  // Later, when saving, pass the version to ensure no one else modified it
  monday.storage.instance.setItem('shared_data', newValue, { 
    previous_version: version 
  }).then(res => {
    if (!res.data.success) {
      // Version mismatch - someone else updated the data
      console.error(res.data.error);
      // "Version mismatch: key was updated from another context"
    }
  });
});
\`\`\`

##### When to Use Each Storage Type

| Storage Type | Use Case | Scope | Resets on Major Version? |
|--------------|----------|-------|--------------------------|
| \`monday.storage.instance\` | Board view settings, widget config, item view state | Per instance | ✅ Yes |
| \`monday.storage\` | User preferences, app config, shared data | Entire app | ❌ No |

##### Storage Best Practices

\`\`\`typescript
// Use structured key prefixes for organization
const STORAGE_KEYS = {
  // Instance-level keys (reset per version)
  viewConfig: 'view_config',
  widgetSettings: 'widget_settings',
  
  // Global keys with prefixes (persist across versions)
  userPrefs: (userId: string) => \`user:\${userId}:prefs\`,
  boardCache: (boardId: string) => \`cache:board:\${boardId}\`,
  appConfig: 'app:config',
  syncState: 'sync:last_run'
};

// Helper with error handling
const getStorageItem = async (key: string, useInstance = true) => {
  try {
    const storage = useInstance ? monday.storage.instance : monday.storage;
    const result = await storage.getItem(key);
    return result.data.value ? JSON.parse(result.data.value) : null;
  } catch (error) {
    console.error('Storage error:', error);
    return null;
  }
};
\`\`\`

#### 4. Execute - Trigger UI Actions

\`\`\`typescript
// Open a confirmation dialog
const confirmed = await monday.execute('confirm', {
  message: 'Are you sure you want to delete this item?',
  confirmButton: 'Yes, delete',
  cancelButton: 'Cancel'
});

// Show a notice/toast
await monday.execute('notice', {
  message: 'Item saved successfully!',
  type: 'success', // 'success' | 'error' | 'info'
  timeout: 3000
});

// Open item card
await monday.execute('openItemCard', {
  itemId: 67890,
  kind: 'columns' // 'columns' | 'updates'
});

// Open settings dialog
await monday.execute('openAppFeatureModal', {
  urlPath: '/settings',
  urlParams: { tab: 'general' }
});
\`\`\`

#### 5. Listen - Subscribe to Events

\`\`\`typescript
// Listen for context changes
monday.listen('context', (res) => {
  console.log('Context changed:', res.data);
});

// Listen for settings changes
monday.listen('settings', (res) => {
  console.log('Settings changed:', res.data);
});

// Listen for item IDs (for batch actions)
monday.listen('itemIds', (res) => {
  console.log('Selected items:', res.data);
});

// Listen for events from board view
monday.listen('events', (res) => {
  console.log('Event received:', res.data);
});
\`\`\`

---`;

// =============================================================================
// MONDAY-CODE DEPLOYMENT
// =============================================================================
export const DEPLOYMENT_CONTENT = `## monday-code Deployment

### What is monday-code?

monday-code is monday.com's serverless hosting platform for app backends. It provides:
- Automatic scaling
- Built-in security
- Environment variable management
- Deployment tracking

### Setting Up Backend

\`\`\`bash
# Your backend code should be in src/ directory
# Entry point should be src/index.ts or src/index.js

# Example backend structure:
src/
├── index.ts           # Main entry point (Express server)
├── routes/
│   ├── webhooks.ts    # Webhook handlers
│   └── api.ts         # API endpoints
├── services/
│   └── monday.ts      # monday.com API service
└── utils/
    └── auth.ts        # Authentication helpers
\`\`\`

### Backend Entry Point Example

\`\`\`typescript
// src/index.ts
import express from 'express';
import { Router } from 'express';

const app = express();
const router = Router();

app.use(express.json());

// Health check endpoint (required)
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Webhook endpoint example
router.post('/webhooks/item-created', async (req, res) => {
  const { event } = req.body;
  
  // Process the webhook
  console.log('Item created:', event);
  
  res.status(200).json({ success: true });
});

// Custom API endpoint
router.get('/api/data', async (req, res) => {
  // Your logic here
  res.json({ data: 'example' });
});

app.use(router);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

export default app;
\`\`\`

### monday-code Services (Backend SDK)

The \`@mondaydotcomorg/apps-sdk\` provides several services for monday-code backend apps:

\`\`\`bash
npm install @mondaydotcomorg/apps-sdk
\`\`\`

#### 1. Environment Variables

Access env vars set via CLI (\`mapps code:env:set\`):

\`\`\`typescript
import { EnvironmentVariablesManager } from '@mondaydotcomorg/apps-sdk';

const envManager = new EnvironmentVariablesManager();

// Get environment variables (async - fetches from monday servers)
const apiKey = await envManager.get('API_KEY');
const webhookSecret = await envManager.get('MONDAY_SIGNING_SECRET');
\`\`\`

#### 2. Secure Storage

Store sensitive data securely (encrypted at rest). Different from regular Storage - use for OAuth tokens, API keys, secrets:

\`\`\`typescript
import { SecureStorage } from '@mondaydotcomorg/apps-sdk';

const secureStorage = new SecureStorage();

// Store OAuth tokens securely
await secureStorage.set('oauth_token', {
  accessToken: 'user-access-token',
  refreshToken: 'user-refresh-token',
  expiresAt: Date.now() + 3600000
});

// Retrieve
const tokenData = await secureStorage.get('oauth_token');

// Delete
await secureStorage.delete('oauth_token');
\`\`\`

#### 3. Storage (Backend Access)

Access the same \`monday.storage\` from backend. See "Storage - Persist App Data" section above for full API:

\`\`\`typescript
import { Storage } from '@mondaydotcomorg/apps-sdk';

const storage = new Storage();
await storage.set('key', JSON.stringify(data));
const result = await storage.get('key');
await storage.delete('key');
\`\`\`

#### 4. Logger

Structured logging viewable in monday-code logs:

\`\`\`typescript
import { Logger } from '@mondaydotcomorg/apps-sdk';

const logger = new Logger('my-app');

logger.info('User action completed', { userId: '123', action: 'create_item' });
logger.warn('Rate limit approaching', { currentRate: 80, limit: 100 });
logger.error('Failed to process webhook', { error: 'Invalid payload' });
logger.debug('Processing request', { requestId: 'abc123' });
\`\`\`

#### 5. Queue (Async Task Processing)

Process tasks asynchronously (useful for bulk operations):

\`\`\`typescript
import { Queue } from '@mondaydotcomorg/apps-sdk';

const queue = new Queue();

// Publish a message
await queue.publishMessage({
  type: 'sync_board',
  boardId: '12345'
});

// Consume messages (in worker)
await queue.consumeMessages(async (message) => {
  if (message.type === 'sync_board') {
    await syncBoard(message.boardId);
  }
});
\`\`\`

#### All Services Import

\`\`\`typescript
import { 
  Logger, 
  Storage, 
  SecureStorage, 
  EnvironmentVariablesManager,
  Queue 
} from '@mondaydotcomorg/apps-sdk';
\`\`\`

### Pushing to monday-code

\`\`\`bash
# Build your app first
npm run build

# Push to monday-code (backend/fullstack apps)
mapps code:push

# Push to monday-code CDN (frontend-only/client-side apps)
mapps code:push -c

# Push to a specific app version
mapps code:push --appVersionId <version_id>


# Combine flags as needed
mapps code:push -c --appVersionId <version_id>
\`\`\`

**When to use \`-c\` (CDN) flag:**
- Frontend-only apps (React, Vue, etc.) without a backend
- Static assets that don't need server-side processing
- Apps that only use the monday SDK client-side

### Environment Variables

\`\`\`bash
# List all environment variable keys
mapps code:env:list --appId <app_id>

# Set an environment variable
mapps code:env:set --appId <app_id> --key API_KEY --value "your-secret-key"

# Delete an environment variable
mapps code:env:delete --appId <app_id> --key API_KEY
\`\`\`

### Connecting Deployment to App Features

**IMPORTANT:** After deploying code to monday-code, you must connect the deployment to your app features. This tells monday.com which deployment URL to use for each feature (board view, item view, widget, etc.).

#### Using CLI (recommended)

\`\`\`bash
# Connect monday-code deployment to an app feature
mapps app-features:build -a <app_id> -i <version_id> -f <feature_id> -d

# Parameters:
# -a, --appId        : Your app ID
# -i, --appVersionId : Your app version ID
# -d                 : Use monday-code deployment (serverless)

# Example:
mapps app-features:build -a 10731315 -i 12024223 -f 14307126 -d
\`\`\`

#### Build Path Configuration

The build path tells monday-code which route/path to use for the feature:
- **Root path (\`/\`)**: Feature served from deployment root (default for most apps)
- **Custom path**: For apps with multiple features, use paths like \`/board-view\`, \`/item-view\`

\`\`\`bash
# Set custom build path for a feature
mapps app-features:build -a <app_id> -i <version_id> -f <feature_id> -d --buildPath /custom-path
\`\`\`

#### Frontend-Only Apps (Views, Widgets)

For apps with only frontend features (board views, item views, dashboard widgets), deploy to CDN:

\`\`\`bash
# Build your frontend app
npm run build

# Deploy to CDN
mapps code:push -c

# Connect to feature
mapps app-features:build -a <app_id> -i <version_id> -f <feature_id> -d
\`\`\`

#### Backend-Only Apps (Integrations, Webhooks)

For apps with only backend features (webhooks, integrations), deploy to serverless:

\`\`\`bash
# Build your backend
npm run build

# Deploy to serverless
mapps code:push

# Connect to integration/webhook feature
mapps app-features:build -a <app_id> -i <version_id> -f <feature_id> -d
\`\`\`

#### Fullstack Apps (Frontend + Backend)

For apps with both frontend views AND backend logic, deploy separately:

\`\`\`
your-app/
├── frontend/              # React app for views
│   ├── src/
│   ├── package.json
│   └── dist/              # Built frontend
└── backend/               # Express server for webhooks/API
    ├── src/
    ├── package.json
    └── dist/              # Built backend
\`\`\`

**Deploy each separately:**
\`\`\`bash
# 1. Deploy frontend to CDN
cd frontend
npm run build
mapps code:push -c

# 2. Deploy backend to serverless
cd ../backend
npm run build
mapps code:push

# 3. Connect frontend features to CDN deployment
mapps app-features:build -a <app_id> -i <version_id> -f <board_view_feature_id> -d

# 4. Connect backend features to serverless deployment
mapps app-features:build -a <app_id> -i <version_id> -f <integration_feature_id> -d
\`\`\`

**Frontend calls backend:**
\`\`\`typescript
// In your frontend React component
const backendUrl = 'https://your-app.monday.app'; // monday-code serverless URL

const response = await fetch(\`\${backendUrl}/api/my-endpoint\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: 'example' })
});
\`\`\`

#### Deployment Flow Summary

| App Type | Command | Use Case |
|----------|---------|----------|
| Frontend only | \`code:push -c\` | Board views, item views, widgets |
| Backend only | \`code:push\` | Webhooks, integrations, API |
| Fullstack | Both commands | Views + backend logic |

### Checking Deployment Status

After pushing, monitor your deployment:

\`\`\`bash
# Check deployment status
mapps code:status --appVersionId <version_id>

# Or use the MCP tool:
# monday_apps_get_deployment_status with appVersionId
\`\`\`

### Logs and Debugging

\`\`\`bash
# View deployment logs
mapps code:logs --appVersionId <version_id>

# Stream logs in real-time
mapps code:logs --appVersionId <version_id> --follow
\`\`\`

---`;

// =============================================================================
// APP FEATURES
// =============================================================================
export const APP_FEATURES_CONTENT = `## App Features

### Board View

\`\`\`typescript
// In your React component
import mondaySdk from '@mondaydotcomorg/monday-sdk-js';

const monday = mondaySdk();

function BoardView() {
  const [context, setContext] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    monday.get('context').then((res) => {
      setContext(res.data);
      fetchItems(res.data.boardId);
    });
  }, []);

  const fetchItems = async (boardId) => {
    const response = await monday.api(\`
      query ($boardId: [ID!]) {
        boards(ids: $boardId) {
          items_page(limit: 100) {
            items {
              id
              name
            }
          }
        }
      }
    \`, { variables: { boardId } });
    
    setItems(response.data.boards[0]?.items_page.items || []);
  };

  return (
    <div className="board-view">
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
\`\`\`

### Item View

\`\`\`typescript
function ItemView() {
  const [item, setItem] = useState(null);

  useEffect(() => {
    monday.get('context').then(async (res) => {
      const { itemId, boardId } = res.data;
      
      const response = await monday.api(\`
        query ($itemId: [ID!]) {
          items(ids: $itemId) {
            id
            name
            column_values {
              id
              text
              value
              column {
                title
              }
            }
          }
        }
      \`, { variables: { itemId } });
      
      setItem(response.data.items[0]);
    });
  }, []);

  return (
    <div className="item-view">
      <h1>{item?.name}</h1>
      {item?.column_values.map(col => (
        <div key={col.id}>
          <strong>{col.column.title}:</strong> {col.text}
        </div>
      ))}
    </div>
  );
}
\`\`\`

### Dashboard Widget

\`\`\`typescript
function DashboardWidget() {
  const [settings, setSettings] = useState({});
  const [data, setData] = useState(null);

  useEffect(() => {
    // Get widget settings
    monday.get('settings').then((res) => {
      setSettings(res.data);
    });

    // Listen for settings changes
    monday.listen('settings', (res) => {
      setSettings(res.data);
    });
  }, []);

  return (
    <div className="widget">
      {/* Widget content based on settings */}
    </div>
  );
}
\`\`\`

### Custom Column

\`\`\`typescript
// Custom column component
function CustomColumn() {
  const [value, setValue] = useState(null);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    monday.get('context').then((res) => {
      // Get current column value
      setValue(res.data.columnValue);
    });

    monday.get('settings').then((res) => {
      setSettings(res.data);
    });
  }, []);

  const updateValue = async (newValue) => {
    // Update the column value
    monday.execute('updateColumnValue', {
      value: JSON.stringify(newValue)
    });
  };

  return (
    <div className="custom-column">
      {/* Render based on value and settings */}
    </div>
  );
}
\`\`\`

### Object View

Object views display custom app objects (Custom Objects). They receive the object instance context.

\`\`\`typescript
function ObjectView() {
  const [objectData, setObjectData] = useState(null);
  const [context, setContext] = useState(null);

  useEffect(() => {
    monday.get('context').then((res) => {
      setContext(res.data);
      // Context includes objectId and other metadata
      const { objectId } = res.data;
      
      // Fetch your custom object data
      fetchObjectData(objectId);
    });
  }, []);

  const fetchObjectData = async (objectId) => {
    // Query your custom object using the API
    const response = await monday.api(\`
      query ($objectId: ID!) {
        app_objects(ids: [$objectId]) {
          id
          name
          kind
          fields {
            id
            title
            type
            value
          }
        }
      }
    \`, { variables: { objectId } });
    
    setObjectData(response.data.app_objects[0]);
  };

  const updateObjectField = async (fieldId, newValue) => {
    await monday.api(\`
      mutation ($objectId: ID!, $fieldId: ID!, $value: String!) {
        update_app_object_field(
          object_id: $objectId,
          field_id: $fieldId,
          value: $value
        ) {
          id
        }
      }
    \`, { 
      variables: { 
        objectId: context.objectId, 
        fieldId, 
        value: JSON.stringify(newValue) 
      } 
    });
  };

  return (
    <div className="object-view">
      <h1>{objectData?.name}</h1>
      {objectData?.fields.map(field => (
        <div key={field.id}>
          <strong>{field.title}:</strong> {field.value}
        </div>
      ))}
    </div>
  );
}
\`\`\`

---`;

// =============================================================================
// WORKFLOW BLOCKS (monday workflows)
// =============================================================================
export const WORKFLOW_BLOCKS_CONTENT = `## Workflow Blocks (monday workflows)

Build custom automation triggers and actions using monday workflows. Each block is created as a separate "Automation block" app feature in the Developer Center.

**Documentation:** [Create a workflow block](https://developer.monday.com/apps/docs/create-a-workflow-block)

### Creating a Workflow Block

1. Go to **Developer Center** > Your App > **Features**
2. Click **Create feature** > **Automation block** > **Create**
3. Configure the block:
   - **Block name**: User-visible name in workflow builder
   - **Block description**: Internal description (not shown to users)
   - **Block type**: Select \`trigger\` or \`action\`

### Block Configuration

| Block Type | Required URLs | Purpose |
|------------|---------------|---------|
| **Trigger** | Subscribe URL, Unsubscribe URL | Called when workflow is activated/deactivated |
| **Action** | Execution URL | Called when the action runs |

### Input & Output Fields

- **Input fields**: Data the user provides when configuring the block
- **Output fields**: Data your block returns (can be used by subsequent blocks)
- **Main field**: Mark one input field as "main" - appears in workflow builder preview

### Trigger Block Handler

\`\`\`typescript
// Subscribe endpoint - called when user activates the workflow
router.post('/triggers/subscribe', async (req, res) => {
  const { payload, webhookUrl } = req.body;
  
  // Store the webhookUrl to call later when trigger fires
  await saveSubscription({
    webhookUrl,
    boardId: payload.inputFields.boardId,
    // ... other input field values
  });
  
  res.status(200).json({ webhookId: 'unique-subscription-id' });
});

// Unsubscribe endpoint - called when user deactivates the workflow
router.post('/triggers/unsubscribe', async (req, res) => {
  const { webhookId } = req.body;
  
  await deleteSubscription(webhookId);
  
  res.status(200).json({ success: true });
});

// When your trigger fires, call the stored webhookUrl
const fireTrigger = async (subscription, outputData) => {
  await fetch(subscription.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trigger: {
        outputFields: {
          itemId: outputData.itemId,
          // ... other output field values matching your block config
        }
      }
    })
  });
};
\`\`\`

### Action Block Handler

\`\`\`typescript
// Execution endpoint - called when action runs in workflow
router.post('/actions/execute', async (req, res) => {
  const { payload } = req.body;
  const { inputFields } = payload;
  
  // Process the action with input fields
  const result = await processAction({
    itemId: inputFields.itemId,
    message: inputFields.message,
    // ... other input field values
  });
  
  // Return output fields for subsequent blocks
  res.status(200).json({
    outputFields: {
      success: true,
      resultId: result.id,
      // ... other output field values matching your block config
    }
  });
});
\`\`\`

### Challenge Verification

monday.com sends a challenge request to verify your endpoints:

\`\`\`typescript
// Handle challenge for all workflow endpoints
router.post('/triggers/*', (req, res, next) => {
  if (req.body.challenge) {
    return res.json({ challenge: req.body.challenge });
  }
  next();
});

router.post('/actions/*', (req, res, next) => {
  if (req.body.challenge) {
    return res.json({ challenge: req.body.challenge });
  }
  next();
});
\`\`\`

---`;

// =============================================================================
// VIBE DESIGN SYSTEM
// =============================================================================
export const VIBE_CONTENT = `## Vibe Design System

Vibe is monday.com's official design system. Use Vibe components to create apps that look and feel native to monday.com.

### Installation

\`\`\`bash
npm install @monday-ui/core
\`\`\`

### Setup

\`\`\`typescript
// Import styles in your entry point (index.tsx or App.tsx)
import "@monday-ui/core/tokens";

// Import components as needed
import { Button, TextField, Dropdown, Modal, Toast } from "@monday-ui/core";
\`\`\`

### Core Components

#### Button

\`\`\`typescript
import { Button } from "@monday-ui/core";

function MyComponent() {
  return (
    <>
      {/* Primary button */}
      <Button onClick={() => console.log('clicked')}>
        Save Changes
      </Button>
      
      {/* Secondary button */}
      <Button kind="secondary" onClick={handleCancel}>
        Cancel
      </Button>
      
      {/* Tertiary/text button */}
      <Button kind="tertiary">
        Learn More
      </Button>
      
      {/* With loading state */}
      <Button loading={isLoading} disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save'}
      </Button>
      
      {/* Different sizes */}
      <Button size="small">Small</Button>
      <Button size="medium">Medium</Button>
      <Button size="large">Large</Button>
    </>
  );
}
\`\`\`

#### TextField

\`\`\`typescript
import { TextField } from "@monday-ui/core";

function SearchInput() {
  const [value, setValue] = useState('');
  
  return (
    <TextField
      placeholder="Search items..."
      value={value}
      onChange={(val) => setValue(val)}
      size="medium"
      // With icon
      iconName="Search"
      // With validation
      validation={{ status: 'error', text: 'Required field' }}
      // With clear button
      clearable
      onClear={() => setValue('')}
    />
  );
}
\`\`\`

#### Dropdown

\`\`\`typescript
import { Dropdown } from "@monday-ui/core";

function StatusDropdown() {
  const options = [
    { value: 'working', label: 'Working on it' },
    { value: 'stuck', label: 'Stuck' },
    { value: 'done', label: 'Done' },
  ];
  
  return (
    <Dropdown
      placeholder="Select status"
      options={options}
      onChange={(option) => console.log(option.value)}
      // Multi-select
      multi={false}
      // Searchable
      searchable
      // With clear
      clearable
    />
  );
}
\`\`\`

#### Modal / Dialog

\`\`\`typescript
import { Modal, ModalContent, ModalFooter, ModalHeader, Button } from "@monday-ui/core";

function ConfirmDialog({ isOpen, onClose, onConfirm }) {
  return (
    <Modal show={isOpen} onClose={onClose}>
      <ModalHeader title="Confirm Action" />
      <ModalContent>
        <p>Are you sure you want to proceed?</p>
      </ModalContent>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onConfirm}>
          Confirm
        </Button>
      </ModalFooter>
    </Modal>
  );
}
\`\`\`

#### Toast / Notifications

\`\`\`typescript
import { Toast } from "@monday-ui/core";

function Notifications() {
  const [showToast, setShowToast] = useState(false);
  
  return (
    <>
      <Button onClick={() => setShowToast(true)}>
        Show Notification
      </Button>
      
      <Toast
        open={showToast}
        onClose={() => setShowToast(false)}
        type="positive" // 'positive' | 'negative' | 'warning'
        autoHideDuration={3000}
      >
        Item saved successfully!
      </Toast>
    </>
  );
}
\`\`\`

#### Loader / Skeleton

\`\`\`typescript
import { Loader, Skeleton } from "@monday-ui/core";

function LoadingState() {
  return (
    <>
      {/* Spinner loader */}
      <Loader size="medium" />
      
      {/* Skeleton for content placeholders */}
      <Skeleton type="text" width={200} />
      <Skeleton type="rectangle" width={300} height={100} />
      <Skeleton type="circle" width={40} height={40} />
    </>
  );
}
\`\`\`

#### Table

\`\`\`typescript
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from "@monday-ui/core";

function ItemsTable({ items }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Owner</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map(item => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.status}</TableCell>
            <TableCell>{item.owner}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
\`\`\`

### Theming & Colors

\`\`\`typescript
// Access monday.com theme colors via CSS variables
const styles = {
  // Primary colors
  primary: 'var(--primary-color)',
  primaryHover: 'var(--primary-hover-color)',
  
  // Text colors
  textPrimary: 'var(--primary-text-color)',
  textSecondary: 'var(--secondary-text-color)',
  
  // Background colors
  background: 'var(--primary-background-color)',
  backgroundHover: 'var(--primary-background-hover-color)',
  
  // Status colors
  positive: 'var(--positive-color)',
  negative: 'var(--negative-color)',
  warning: 'var(--warning-color)',
};

// Respond to monday.com theme (light/dark)
monday.get('context').then(res => {
  const theme = res.data.theme; // 'light' | 'dark'
  document.body.setAttribute('data-theme', theme);
});

monday.listen('context', res => {
  document.body.setAttribute('data-theme', res.data.theme);
});
\`\`\`

### Icons

\`\`\`typescript
import { Icon } from "@monday-ui/core";
import { Add, Search, Settings, Person, Board } from "@monday-ui/core/icons";

function IconExamples() {
  return (
    <>
      {/* Using icon components directly */}
      <Add size={24} />
      <Search size={20} />
      
      {/* Using Icon wrapper */}
      <Icon icon={Settings} iconSize={24} />
      
      {/* With click handler */}
      <Icon 
        icon={Add} 
        iconSize={20} 
        onClick={() => console.log('add clicked')}
        clickable
      />
    </>
  );
}
\`\`\`

---`;

// =============================================================================
// DEPLOYMENT WORKFLOW & GUARDRAILS
// =============================================================================
export const DEPLOYMENT_WORKFLOW_CONTENT = `## Deployment Workflow & Guardrails

This section covers the critical deployment workflow and guardrails you must follow when building monday.com apps.

### Project Setup Requirements

Before deploying, ensure your project meets these requirements:

\`\`\`json
// package.json - MUST include:
{
  "type": "module",
  "main": "index.js"
}
\`\`\`

\`\`\`javascript
// index.js - Entry point serving dist/
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, 'dist')));
app.get('/health', (req, res) => res.send('OK'));

app.listen(process.env.PORT || 8080);
\`\`\`

### Draft vs Live Version Lifecycle

**CRITICAL: Understanding version states is essential for successful deployment.**

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                    VERSION LIFECYCLE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   CREATE APP ──► DRAFT VERSION                              │
│                      │                                      │
│                      ▼                                      │
│              Add Features (MCP)                             │
│                      │                                      │
│                      ▼                                      │
│              Push Code (CLI)                                │
│                      │                                      │
│                      ▼                                      │
│              Build Features (CLI)                           │
│                      │                                      │
│                      ▼                                      │
│              PROMOTE ──► LIVE VERSION                       │
│                                                             │
│   ⚠️  Once LIVE, you CANNOT modify the version!            │
│   ⚠️  Create a new draft version for changes.              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
\`\`\`

### Mandatory Deployment Order

**⚠️ CRITICAL: Follow this EXACT order. Skipping steps or changing order WILL cause failures.**

\`\`\`bash
# STEP 1: Create App (via MCP tool)
# Tool: monday_apps_create_app
# Returns: appId and versionId (version starts as DRAFT)

# STEP 2: Create Feature (via MCP tool)
# Tool: monday_apps_create_app_feature
# ⚠️ NEVER pass the "data" parameter - it can corrupt the feature schema!

# STEP 3: Push Code (via CLI)
npx -y @mondaycom/apps-cli@latest code:push -a <appId> -i <versionId> -d .
# ⚠️ First deployment takes ~6 minutes. Wait for completion!

# STEP 4: Build Feature (via CLI) - Connects code to feature
npx -y @mondaycom/apps-cli@latest app-features:build -a <appId> -i <versionId> -f <featureId> -d

# STEP 5: Promote to Live (via CLI or MCP)
npx -y @mondaycom/apps-cli@latest app:promote -a <appId> -i <versionId>
# OR use MCP tool: monday_apps_promote_app
\`\`\`

### .mappsrc Configuration File

Create a \`.mappsrc\` file to automate CLI arguments:

\`\`\`json
{
  "appId": 12345678,
  "versionId": 87654321,
  "accessToken": "your-api-token"
}
\`\`\`

With \`.mappsrc\`, you can simplify commands:
\`\`\`bash
# Instead of:
npx -y @mondaycom/apps-cli@latest code:push -a 12345678 -i 87654321 -d .

# You can just run:
npx -y @mondaycom/apps-cli@latest code:push -d .
\`\`\`

### Pre-Flight Checklist

**Before deploying, verify ALL of these:**

\`\`\`
☐ Version is DRAFT (check with monday_apps_get_app_versions)
☐ Feature exists (check with monday_apps_get_app_features)  
☐ Build completed (npm run build - dist/ folder exists)
☐ package.json has "type": "module"
☐ index.js entry point serves dist/ folder
☐ .mappsrc or CLI args are correct
\`\`\`

### Critical Warnings & Guardrails

#### ⛔ NEVER Do These:

1. **Never pass \`data\` parameter to \`create_app_feature\`**
\`\`\`typescript
   // ❌ BAD - Can corrupt feature schema
   monday_apps_create_app_feature({
     appId: 123,
     appVersionId: 456,
     name: "My View",
     type: "AppFeatureBoardView",
     data: { ... }  // ⛔ NEVER include this!
   });
   
   // ✅ GOOD - Let monday.com set defaults
   monday_apps_create_app_feature({
     appId: 123,
     appVersionId: 456,
     name: "My View",
     type: "AppFeatureBoardView"
   });
   \`\`\`

2. **Never promote before BOTH code:push AND app-features:build complete**
   \`\`\`bash
   # ❌ BAD - Promoting too early
   code:push ──► promote  # Missing app-features:build!
   
   # ✅ GOOD - Complete workflow
   code:push ──► app-features:build ──► promote
\`\`\`

3. **Never try to modify a LIVE version**
   \`\`\`bash
   # If you see "No valid version found" error:
   # The version is LIVE. Create a new draft version first.
\`\`\`

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "No valid version found" | Trying to modify a LIVE version | Create a new draft version |
| "Permission denied" | Global CLI install issues | Use \`npx -y @mondaycom/apps-cli@latest\` |
| Feature not showing | \`app-features:build\` not run | Run the build command after code:push |
| Deployment timeout | First deploy takes longer | Wait ~6 minutes for first deployment |
| Schema corruption | Passed \`data\` param to create_app_feature | Delete feature, recreate WITHOUT data param |

### Deployment Timing Expectations

| Operation | Expected Duration |
|-----------|-------------------|
| \`code:push\` (first time) | ~5-6 minutes |
| \`code:push\` (subsequent) | ~1-2 minutes |
| \`app-features:build\` | ~30 seconds |
| \`promote\` | ~10 seconds |

---`;

// =============================================================================
// BEST PRACTICES
// =============================================================================
export const BEST_PRACTICES_CONTENT = `## Best Practices

### 1. Performance

\`\`\`typescript
// ❌ Bad: Multiple separate API calls
for (const itemId of itemIds) {
  await monday.api(\`query { items(ids: [\${itemId}]) { ... } }\`);
}

// ✅ Good: Single batched query
await monday.api(\`
  query ($ids: [ID!]) {
    items(ids: $ids) {
      id
      name
    }
  }
\`, { variables: { ids: itemIds } });
\`\`\`

### 2. Error Handling

\`\`\`typescript
// Always wrap API calls in try-catch
const fetchData = async () => {
  try {
    const response = await monday.api(query);
    
    if (response.errors) {
      console.error('GraphQL errors:', response.errors);
      monday.execute('notice', {
        message: 'Failed to fetch data',
        type: 'error'
      });
      return null;
    }
    
    return response.data;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};
\`\`\`

### 3. Rate Limiting

\`\`\`typescript
// Respect API rate limits (10,000 complexity per minute)
// Use pagination for large datasets
const fetchAllItems = async (boardId) => {
  let allItems = [];
  let cursor = null;
  
  do {
    const response = await monday.api(\`
      query ($boardId: ID!, $cursor: String) {
        boards(ids: [$boardId]) {
          items_page(limit: 100, cursor: $cursor) {
            cursor
            items {
              id
              name
            }
          }
        }
      }
    \`, { variables: { boardId, cursor } });
    
    const page = response.data.boards[0].items_page;
    allItems = [...allItems, ...page.items];
    cursor = page.cursor;
  } while (cursor);
  
  return allItems;
};
\`\`\`

### 4. Security

\`\`\`typescript
// Backend: Verify requests are from monday.com
import crypto from 'crypto';

const verifyWebhookSignature = (req) => {
  const signature = req.headers['authorization'];
  const signingSecret = process.env.MONDAY_SIGNING_SECRET;
  
  const hash = crypto
    .createHmac('sha256', signingSecret)
    .update(JSON.stringify(req.body))
    .digest('base64');
    
  return signature === hash;
};

// Middleware
app.use('/webhooks', (req, res, next) => {
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  next();
});
\`\`\`

### 5. Storage Best Practices

\`\`\`typescript
// Use structured keys for organization
const STORAGE_KEYS = {
  userSettings: (userId) => \`user:\${userId}:settings\`,
  boardConfig: (boardId) => \`board:\${boardId}:config\`,
  cache: (key) => \`cache:\${key}\`
};

// Set with proper error handling
const saveSettings = async (userId, settings) => {
  try {
    await monday.storage.instance.setItem(
      STORAGE_KEYS.userSettings(userId),
      JSON.stringify(settings)
    );
    return true;
  } catch (error) {
    console.error('Storage error:', error);
    return false;
  }
};
\`\`\`

---`;

// =============================================================================
// TROUBLESHOOTING
// =============================================================================
export const TROUBLESHOOTING_CONTENT = `## Troubleshooting

### Common Issues

#### 1. "Context is undefined"

\`\`\`typescript
// Make sure you're inside a monday.com iframe
const isInMonday = window.location !== window.parent.location;

if (!isInMonday) {
  console.log('Not running inside monday.com');
  return;
}

// Always wait for SDK initialization
monday.get('context').then((res) => {
  if (!res.data) {
    console.error('No context available');
    return;
  }
  // Continue with your logic
});
\`\`\`

#### 2. API Complexity Errors

\`\`\`typescript
// Reduce query complexity by:
// 1. Limiting fields requested
// 2. Using pagination
// 3. Avoiding nested queries when possible

// ❌ High complexity
query {
  boards {
    items_page {
      items {
        subitems { ... }
        updates { ... }
      }
    }
  }
}

// ✅ Lower complexity - paginate and limit
query ($limit: Int, $cursor: String) {
  boards(ids: [12345]) {
    items_page(limit: $limit, cursor: $cursor) {
      cursor
      items {
        id
        name
      }
    }
  }
}
\`\`\`

#### 3. CORS Issues in Development

\`\`\`typescript
// In your backend, add CORS headers
import cors from 'cors';

app.use(cors({
  origin: [
    'https://monday.com',
    'https://*.monday.com',
    'http://localhost:3000' // For local development
  ],
  credentials: true
}));
\`\`\`

#### 4. Deployment Failures

\`\`\`bash
# Check build output
npm run build

# Verify entry point in package.json
# "main": "dist/index.js"

# Check for TypeScript errors
npx tsc --noEmit

# Review monday-code logs
mapps code:logs --appVersionId <version_id>
\`\`\`

### Debug Mode

\`\`\`typescript
// Enable debug mode for SDK
monday.setApiVersion('2026-01');

// Log all API calls
const originalApi = monday.api;
monday.api = async (...args) => {
  console.log('API call:', args[0]);
  const result = await originalApi.apply(monday, args);
  console.log('API result:', result);
  return result;
};
\`\`\`

---`;

// =============================================================================
// CLI COMMANDS
// =============================================================================
export const CLI_COMMANDS_CONTENT = `## CLI Commands Reference

Use \`npx -y @mondaycom/apps-cli@latest [COMMAND]\` or install globally with \`npm i -g @mondaycom/apps-cli\`.

### Init

\`\`\`bash
mapps init                              # Initialize .mappsrc config file with API token
\`\`\`

### App Management (app:*)

\`\`\`bash
mapps app:create                        # Create a new monday.com app
mapps app:list                          # List all apps for the authenticated user
mapps app:deploy                        # Deploy an app using manifest file
mapps app:promote                       # Promote an app version to live
mapps app:scaffold                      # Scaffold a new app project from template
\`\`\`

### App Versions (app-version:*)

\`\`\`bash
mapps app-version:list -a <app_id>      # List all versions for a specific app
mapps app-version:builds -i <version_id> # List all builds for a specific app version
\`\`\`

### App Features (app-features:*)

\`\`\`bash
mapps app-features:list -a <app_id> -i <version_id>     # List all features for an app version
mapps app-features:create -a <app_id> -i <version_id>   # Create an app feature (board view, widget, etc.)
mapps app-features:build -a <app_id> -i <version_id> -f <feature_id> -d  # Connect deployment to feature
mapps app-features:build ... -d -t monday_code          # Specify hosting type
mapps app-features:build ... -d --buildPath /custom-path # Custom build path
\`\`\`

### Code Deployment (code:*)

\`\`\`bash
mapps code:push                         # Push to monday-code serverless (backend)
mapps code:push -c                      # Push to CDN (frontend-only apps)
mapps code:status -i <version_id>       # Get deployment status
mapps code:logs -i <version_id>         # Fetch logs from monday-code
mapps code:logs -i <version_id> --follow # Stream logs in real-time
mapps code:env                          # Manage environment variables (list-keys, set, delete)
mapps code:secret                       # Manage secret variables (list-keys, set, delete)
mapps code:report -i <version_id>       # Get security scan report for deployed code
\`\`\`

### Scheduler (scheduler:*)

\`\`\`bash
mapps scheduler:list -a <app_id>        # List all scheduler jobs for an app
mapps scheduler:create                  # Create a new scheduler/cron job
mapps scheduler:update                  # Update an existing scheduler job
mapps scheduler:delete                  # Delete a scheduler job
mapps scheduler:run                     # Manually trigger a scheduled job to run
\`\`\`

### Storage (storage:*)

\`\`\`bash
mapps storage:search -a <app_id>        # Search keys/values for a specific customer account
mapps storage:export -a <app_id>        # Export all keys/values (JSON/CSV)
mapps storage:remove-data -a <app_id>   # Remove all storage data for a customer account
\`\`\`

### Database (database:*)

\`\`\`bash
mapps database:connection-string -a <app_id>  # Get PostgreSQL connection string for app database
\`\`\`

### Manifest (manifest:*)

\`\`\`bash
mapps manifest:export -a <app_id> -i <version_id>        # Export app manifest to file
mapps manifest:import -p ./manifest.json -a <app_id> -i <version_id>  # Import manifest to create/update app
\`\`\`

**Manifest OAuth section example:**
\`\`\`json
{
  "oauth": {
    "scopes": ["boards:read", "boards:write", "users:read"]
  }
}
\`\`\`

### Tunnel (tunnel:*)

\`\`\`bash
mapps tunnel:create                     # Create ngrok tunnel to expose local code publicly
\`\`\`

### API (api:*)

\`\`\`bash
mapps api:generate                      # Generate GraphQL API setup for custom queries
\`\`\`

### Help & Utilities

\`\`\`bash
mapps help [COMMAND]                    # Display help for mapps
mapps autocomplete [SHELL]              # Setup shell autocomplete (bash/zsh/powershell)
\`\`\`

### Global Flags

| Flag | Description |
|------|-------------|
| \`--verbose\` | Print advanced/debug logs |
| \`--print-command\` | Print the command that was executed |
| \`--help\` | Show help for command |

---`;

// =============================================================================
// USEFUL LINKS
// =============================================================================
export const USEFUL_LINKS_CONTENT = `## Useful Links

- [monday.com Apps Framework Documentation](https://developer.monday.com/apps/docs)
- [monday-code Documentation](https://developer.monday.com/apps/docs/hosting-your-app-with-monday-code)
- [GraphQL API Reference](https://developer.monday.com/api-reference/reference)
- [SDK Documentation](https://developer.monday.com/apps/docs/mondaycom-client-sdk)
- [Vibe Design System](https://style.monday.com/) - Build monday.com-style UIs
- [App Marketplace](https://monday.com/marketplace)`;

// =============================================================================
// COMBINED SECTIONS FOR CONTEXT TYPES
// =============================================================================

/**
 * Quick Start section combines: Overview + Quick Start + OAuth Scopes
 */
export const QUICK_START_SECTION = `# monday.com App Development - Quick Start

${OVERVIEW_CONTENT}

${QUICK_START_CONTENT}

${OAUTH_SCOPES_CONTENT}`;

/**
 * Troubleshooting section combines: Troubleshooting + CLI Commands
 */
export const TROUBLESHOOTING_SECTION = `# monday.com App Development - Troubleshooting

${TROUBLESHOOTING_CONTENT}

${CLI_COMMANDS_CONTENT}`;

/**
 * Full content - all sections combined
 */
export const APP_DEVELOPMENT_GUIDE_CONTENT = `${OVERVIEW_CONTENT}

${QUICK_START_CONTENT}

${OAUTH_SCOPES_CONTENT}

${SDK_REFERENCE_CONTENT}

${DEPLOYMENT_CONTENT}

${DEPLOYMENT_WORKFLOW_CONTENT}

${APP_FEATURES_CONTENT}

${WORKFLOW_BLOCKS_CONTENT}

${VIBE_CONTENT}

${BEST_PRACTICES_CONTENT}

${TROUBLESHOOTING_CONTENT}

${CLI_COMMANDS_CONTENT}

${USEFUL_LINKS_CONTENT}`;

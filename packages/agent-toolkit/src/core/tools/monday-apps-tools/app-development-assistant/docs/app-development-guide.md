# monday.com App Development Complete Guide

## Overview

This guide provides comprehensive documentation for building, deploying, and maintaining monday.com apps. Use this as your reference for SDK usage, monday-code deployment, and best practices.

---

## Quick Start

### Prerequisites

1. **Node.js 18+** - Required for development and deployment
2. **monday.com Developer Account** - Enable developer mode in your account settings
3. **monday CLI (mapps)** - Install globally: `npm install -g @mondaycom/apps-cli`

### Creating Your First App

```bash
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
```

### App Structure

```
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
```

---

## monday.com SDK Reference

### Installation

```bash
npm install @mondaydotcomorg/monday-sdk-js
```

### Basic Usage

```typescript
import mondaySdk from '@mondaydotcomorg/monday-sdk-js';

const monday = mondaySdk();

// Initialize the SDK
monday.setApiVersion('2026-01');
```

### Core SDK Methods

#### 1. Context - Get App Context

```typescript
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
```

#### 2. API - Execute GraphQL Queries

```typescript
// Query boards
const response = await monday.api(`
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
`);

// Mutation - Create item
const createItem = await monday.api(`
  mutation {
    create_item(
      board_id: 12345,
      item_name: "New Task",
      column_values: "{\"status\": {\"label\": \"Working on it\"}}"
    ) {
      id
      name
    }
  }
`);

// Mutation - Update column value
const updateColumn = await monday.api(`
  mutation {
    change_column_value(
      board_id: 12345,
      item_id: 67890,
      column_id: "status",
      value: "{\"label\": \"Done\"}"
    ) {
      id
    }
  }
`);
```

#### 3. Storage - Persist App Data

**Two storage types:**

- `monday.storage.instance` - Scoped to each feature instance (board view, widget, etc.)
- `monday.storage` - Global, shared across entire app

```typescript
// ============================================
// INSTANCE STORAGE - Per feature instance
// ============================================

// Store instance-specific data (e.g., board view config)
await monday.storage.instance.setItem(
  'view_config',
  JSON.stringify({
    columns: ['status', 'date'],
    sortBy: 'date',
  }),
);

// Retrieve instance data
const result = await monday.storage.instance.getItem('view_config');
const config = JSON.parse(result.data.value);
console.log(result.data.version); // For concurrency control

// Delete instance data
await monday.storage.instance.deleteItem('view_config');

// ============================================
// GLOBAL STORAGE - Shared across entire app
// ============================================

// Store app-level settings
await monday.storage.setItem(
  'app_config',
  JSON.stringify({
    apiEndpoint: 'https://api.example.com',
    featureFlags: { beta: true },
  }),
);

// Retrieve app-level data
const appResult = await monday.storage.getItem('app_config');
const appConfig = JSON.parse(appResult.data.value);

// Search for keys (global storage only)
const searchResult = await monday.storage.searchItem('user_');
console.log(searchResult.data); // Returns matching keys

// Delete app-level data
await monday.storage.deleteItem('app_config');
```

**Key Differences:**

| Storage Type              | Scope        | Resets on Major Version? | Use Case                            |
| ------------------------- | ------------ | ------------------------ | ----------------------------------- |
| `monday.storage.instance` | Per instance | ✅ Yes                   | Board view config, widget settings  |
| `monday.storage`          | Entire app   | ❌ No                    | User prefs, app config, shared data |

#### 4. Execute - Trigger UI Actions

```typescript
// Open a confirmation dialog
const confirmed = await monday.execute('confirm', {
  message: 'Are you sure you want to delete this item?',
  confirmButton: 'Yes, delete',
  cancelButton: 'Cancel',
});

// Show a notice/toast
await monday.execute('notice', {
  message: 'Item saved successfully!',
  type: 'success', // 'success' | 'error' | 'info'
  timeout: 3000,
});

// Open item card
await monday.execute('openItemCard', {
  itemId: 67890,
  kind: 'columns', // 'columns' | 'updates'
});

// Open settings dialog
await monday.execute('openAppFeatureModal', {
  urlPath: '/settings',
  urlParams: { tab: 'general' },
});
```

#### 5. Listen - Subscribe to Events

```typescript
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
```

---

## monday-code Deployment

### What is monday-code?

monday-code is monday.com's serverless hosting platform for app backends. It provides:

- Automatic scaling
- Built-in security
- Environment variable management
- Deployment tracking

### Setting Up Backend

```bash
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
```

### Backend Entry Point Example

```typescript
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
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

### Pushing to monday-code

```bash
# Build your app first
npm run build

# Push to monday-code (draft version)
mapps code:push

# Push to a specific app version
mapps code:push --appVersionId <version_id>
```

### Environment Variables

```bash
# List all environment variable keys
mapps code:env:list --appId <app_id>

# Set an environment variable
mapps code:env:set --appId <app_id> --key API_KEY --value "your-secret-key"

# Delete an environment variable
mapps code:env:delete --appId <app_id> --key API_KEY
```

### Checking Deployment Status

After pushing, monitor your deployment:

```bash
# Check deployment status
mapps code:status --appVersionId <version_id>

# Or use the MCP tool:
# monday_apps_get_deployment_status with appVersionId
```

### Logs and Debugging

```bash
# View deployment logs
mapps code:logs --appVersionId <version_id>

# Stream logs in real-time
mapps code:logs --appVersionId <version_id> --follow
```

### Scheduler (Cron Jobs)

```bash
# List all scheduler jobs for an app
mapps scheduler:list -a <app_id>

# Create a new scheduler job
mapps scheduler:create

# Update an existing scheduler job
mapps scheduler:update

# Delete a scheduler job
mapps scheduler:delete

# Manually trigger a scheduled job to run
mapps scheduler:run
```

---

## App Features

### Board View

```typescript
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
    const response = await monday.api(`
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
    `, { variables: { boardId } });

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
```

### Item View

```typescript
function ItemView() {
  const [item, setItem] = useState(null);

  useEffect(() => {
    monday.get('context').then(async (res) => {
      const { itemId, boardId } = res.data;

      const response = await monday.api(`
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
      `, { variables: { itemId } });

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
```

### Dashboard Widget

```typescript
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
```

### Custom Column

```typescript
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
```

### Object View

Object views display custom app objects (Custom Objects). They receive the object instance context.

```typescript
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
    const response = await monday.api(`
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
    `, { variables: { objectId } });

    setObjectData(response.data.app_objects[0]);
  };

  const updateObjectField = async (fieldId, newValue) => {
    await monday.api(`
      mutation ($objectId: ID!, $fieldId: ID!, $value: String!) {
        update_app_object_field(
          object_id: $objectId,
          field_id: $fieldId,
          value: $value
        ) {
          id
        }
      }
    `, {
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
```

---

## Workflow Blocks (monday workflows)

Build custom automation triggers and actions using monday workflows. Each block is created as a separate "Automation block" app feature in the Developer Center.

**Documentation:** [Create a workflow block](https://developer.monday.com/apps/docs/create-a-workflow-block)

### Creating a Workflow Block

1. Go to **Developer Center** > Your App > **Features**
2. Click **Create feature** > **Automation block** > **Create**
3. Configure the block:
   - **Block name**: User-visible name in workflow builder
   - **Block description**: Internal description (not shown to users)
   - **Block type**: Select `trigger` or `action`

### Block Configuration

| Block Type  | Required URLs                  | Purpose                                       |
| ----------- | ------------------------------ | --------------------------------------------- |
| **Trigger** | Subscribe URL, Unsubscribe URL | Called when workflow is activated/deactivated |
| **Action**  | Execution URL                  | Called when the action runs                   |

### Input & Output Fields

- **Input fields**: Data the user provides when configuring the block
- **Output fields**: Data your block returns (can be used by subsequent blocks)
- **Main field**: Mark one input field as "main" - appears in workflow builder preview

### Trigger Block Handler

```typescript
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
        },
      },
    }),
  });
};
```

### Action Block Handler

```typescript
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
    },
  });
});
```

### Challenge Verification

monday.com sends a challenge request to verify your endpoints:

```typescript
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
```

---

## Best Practices

### 1. Performance

```typescript
// ❌ Bad: Multiple separate API calls
for (const itemId of itemIds) {
  await monday.api(`query { items(ids: [${itemId}]) { ... } }`);
}

// ✅ Good: Single batched query
await monday.api(
  `
  query ($ids: [ID!]) {
    items(ids: $ids) {
      id
      name
    }
  }
`,
  { variables: { ids: itemIds } },
);
```

### 2. Error Handling

```typescript
// Always wrap API calls in try-catch
const fetchData = async () => {
  try {
    const response = await monday.api(query);

    if (response.errors) {
      console.error('GraphQL errors:', response.errors);
      monday.execute('notice', {
        message: 'Failed to fetch data',
        type: 'error',
      });
      return null;
    }

    return response.data;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};
```

### 3. Rate Limiting

```typescript
// Respect API rate limits (10,000 complexity per minute)
// Use pagination for large datasets
const fetchAllItems = async (boardId) => {
  let allItems = [];
  let cursor = null;

  do {
    const response = await monday.api(
      `
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
    `,
      { variables: { boardId, cursor } },
    );

    const page = response.data.boards[0].items_page;
    allItems = [...allItems, ...page.items];
    cursor = page.cursor;
  } while (cursor);

  return allItems;
};
```

### 4. Security

```typescript
// Backend: Verify requests are from monday.com
import crypto from 'crypto';

const verifyWebhookSignature = (req) => {
  const signature = req.headers['authorization'];
  const signingSecret = process.env.MONDAY_SIGNING_SECRET;

  const hash = crypto.createHmac('sha256', signingSecret).update(JSON.stringify(req.body)).digest('base64');

  return signature === hash;
};

// Middleware
app.use('/webhooks', (req, res, next) => {
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  next();
});
```

### 5. Storage Best Practices

```typescript
// Use structured keys for organization
const STORAGE_KEYS = {
  // Instance storage keys (per board view, widget, etc.)
  viewConfig: 'view_config',
  widgetSettings: 'widget_settings',

  // Global storage keys (shared across app)
  userPrefs: (userId) => `user:${userId}:prefs`,
  appConfig: 'app_config',
  cache: (key) => `cache:${key}`,
};

// Helper with error handling for both storage types
const getStorageItem = async (key, useInstance = true) => {
  try {
    const storage = useInstance ? monday.storage.instance : monday.storage;
    const result = await storage.getItem(key);
    return result.data.value ? JSON.parse(result.data.value) : null;
  } catch (error) {
    console.error('Storage error:', error);
    return null;
  }
};

// Use versioning to prevent concurrent overwrites
const saveWithVersioning = async (key, newValue) => {
  const result = await monday.storage.instance.getItem(key);
  const { version } = result.data;

  const saveResult = await monday.storage.instance.setItem(key, JSON.stringify(newValue), {
    previous_version: version,
  });

  if (!saveResult.data.success) {
    console.error('Version mismatch - data was modified by another user');
    return false;
  }
  return true;
};
```

---

## Troubleshooting

### Common Issues

#### 1. "Context is undefined"

```typescript
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
```

#### 2. API Complexity Errors

```typescript
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
```

#### 3. CORS Issues in Development

```typescript
// In your backend, add CORS headers
import cors from 'cors';

app.use(
  cors({
    origin: [
      'https://monday.com',
      'https://*.monday.com',
      'http://localhost:3000', // For local development
    ],
    credentials: true,
  }),
);
```

#### 4. Deployment Failures

```bash
# Check build output
npm run build

# Verify entry point in package.json
# "main": "dist/index.js"

# Check for TypeScript errors
npx tsc --noEmit

# Review monday-code logs
mapps code:logs --appVersionId <version_id>
```

### Debug Mode

```typescript
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
```

---

## CLI Commands Reference

### App Management

```bash
# Initialize new app
mapps init

# List your apps
mapps app:list

# Get app details
mapps app:info --appId <app_id>
```

### Development

```bash
# Start local development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Deployment

```bash
# Push to monday-code
mapps code:push

# Check deployment status
mapps code:status --appVersionId <version_id>

# View logs
mapps code:logs --appVersionId <version_id>

# Environment variables
mapps code:env:list --appId <app_id>
mapps code:env:set --appId <app_id> --key KEY --value "value"
```

### Version Management

```bash
# Create new version
mapps app:version:create --appId <app_id>

# Promote to live
mapps app:version:promote --appVersionId <version_id>
```

---

## Useful Links

- [monday.com Apps Framework Documentation](https://developer.monday.com/apps/docs)
- [monday-code Documentation](https://developer.monday.com/apps/docs/hosting-your-app-with-monday-code)
- [GraphQL API Reference](https://developer.monday.com/api-reference/reference)
- [SDK Documentation](https://developer.monday.com/apps/docs/mondaycom-client-sdk)
- [Vibe Design System](https://style.monday.com/) - Build monday.com-style UIs
- [App Marketplace](https://monday.com/marketplace)

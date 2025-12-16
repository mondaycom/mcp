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
monday.setApiVersion('2024-10');
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

\`\`\`typescript
// Store data
await monday.storage.instance.setItem('user_settings', JSON.stringify({
  theme: 'dark',
  notifications: true
}));

// Retrieve data
const result = await monday.storage.instance.getItem('user_settings');
const settings = JSON.parse(result.data.value);

// Delete data
await monday.storage.instance.deleteItem('user_settings');
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

# Push with force (skip confirmation)
mapps code:push --force

# Combine flags as needed
mapps code:push -c --force --appVersionId <version_id>
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

#### Multiple Features Example

If your app has multiple features (e.g., board view + item view):

\`\`\`javascript
// src/index.ts - Express server handling multiple features
import express from 'express';
import path from 'path';

const app = express();

// Serve board view at /board-view
app.use('/board-view', express.static(path.join(__dirname, 'public/board-view')));

// Serve item view at /item-view  
app.use('/item-view', express.static(path.join(__dirname, 'public/item-view')));

// Health check for monday-code
app.get('/health', (req, res) => res.send('OK'));

app.listen(process.env.PORT || 8080);
\`\`\`

Then connect each feature with its build path:
\`\`\`bash
# Connect board view feature
mapps app-features:build -a <app_id> -i <version_id> -f <board_view_feature_id> -d --buildPath /board-view

# Connect item view feature
mapps app-features:build -a <app_id> -i <version_id> -f <item_view_feature_id> -d --buildPath /item-view
\`\`\`

#### CDN Deployment for Frontend-Only Apps

For frontend-only apps (no backend), use CDN deployment:

\`\`\`bash
# First push to CDN
mapps code:push -c

# Then connect to feature (note: uses default deployment URL automatically for CDN)
mapps app-features:build -a <app_id> -i <version_id> -f <feature_id> -d
\`\`\`

#### Deployment Flow Summary

After creating an app with features, the complete deployment flow is:

1. **Build your app**: \`npm run build\`
2. **Push to monday-code**: \`mapps code:push\` (or \`mapps code:push -c\` for CDN)
3. **Get feature IDs**: \`mapps app-features:list -a <app_id> -i <version_id>\`
4. **Connect deployment to each feature**: \`mapps app-features:build -a <app_id> -i <version_id> -f <feature_id> -d\`
5. **Test your app** in monday.com

**Auto-connect tip:** Always connect deployment to features immediately after \`code:push\`. This ensures users can access your app's UI.

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
// WORKFLOW BLOCKS
// =============================================================================
export const WORKFLOW_BLOCKS_CONTENT = `## Workflow Blocks (Integrations & Automations)

Workflow blocks allow you to create custom triggers and actions that users can use in monday.com's automation recipes.

### Block Types

1. **Triggers** - Events that start an automation (e.g., "When an item is created")
2. **Actions** - Operations performed when triggered (e.g., "Send to my service")
3. **Custom Fields** - Input fields users configure in the recipe

### Creating Custom Triggers

\`\`\`typescript
// Manifest configuration for a custom trigger
{
  "type": "AppFeatureWorkflowBlock",
  "kind": "trigger",
  "name": "high_priority_item",
  "sentence": "When an item's priority is set to {priority} in {boardId}",
  "inputFields": [
    {
      "key": "boardId",
      "type": "board",
      "title": "Board"
    },
    {
      "key": "priority",
      "type": "dropdown",
      "title": "Priority Level",
      "options": [
        { "value": "critical", "title": "Critical" },
        { "value": "high", "title": "High" },
        { "value": "medium", "title": "Medium" }
      ]
    }
  ],
  "outputFields": [
    {
      "key": "itemId",
      "type": "text",
      "title": "Item ID"
    },
    {
      "key": "itemName",
      "type": "text", 
      "title": "Item Name"
    }
  ],
  "webhookUrl": "https://your-app.monday.app/webhooks/trigger/high-priority"
}
\`\`\`

### Creating Custom Actions

\`\`\`typescript
// Manifest configuration for a custom action
{
  "type": "AppFeatureWorkflowBlock",
  "kind": "action",
  "name": "send_to_slack",
  "sentence": "Send {message} to Slack channel {channel}",
  "inputFields": [
    {
      "key": "message",
      "type": "text",
      "title": "Message",
      "description": "The message to send"
    },
    {
      "key": "channel",
      "type": "text",
      "title": "Slack Channel",
      "description": "Channel name or ID"
    },
    {
      "key": "includeLink",
      "type": "boolean",
      "title": "Include item link",
      "defaultValue": true
    }
  ],
  "webhookUrl": "https://your-app.monday.app/webhooks/action/send-slack"
}
\`\`\`

### Input Field Types

| Type | Description | Example Use |
|------|-------------|-------------|
| \`text\` | Free text input | Message content, names |
| \`board\` | Board selector | Select a board |
| \`column\` | Column selector | Select a column from board |
| \`dropdown\` | Predefined options | Status, priority levels |
| \`boolean\` | Checkbox | Enable/disable options |
| \`number\` | Numeric input | Thresholds, counts |
| \`date\` | Date picker | Due dates, schedules |

### Webhook Handler for Workflow Blocks

\`\`\`typescript
// Backend handler for workflow block webhooks
import express from 'express';

const router = express.Router();

// Handle trigger subscription (monday.com subscribing to your trigger)
router.post('/webhooks/trigger/high-priority', async (req, res) => {
  const { challenge, payload, type } = req.body;
  
  // Handle webhook verification
  if (challenge) {
    return res.json({ challenge });
  }
  
  // Handle subscription request
  if (type === 'subscribe') {
    const { webhookUrl, subscriptionId, inputFields } = payload;
    // Store the subscription to notify later when trigger conditions are met
    await saveSubscription({
      subscriptionId,
      webhookUrl,
      boardId: inputFields.boardId,
      priority: inputFields.priority
    });
    return res.json({ success: true });
  }
  
  // Handle unsubscribe
  if (type === 'unsubscribe') {
    await removeSubscription(payload.subscriptionId);
    return res.json({ success: true });
  }
  
  res.status(200).json({ success: true });
});

// Handle action execution
router.post('/webhooks/action/send-slack', async (req, res) => {
  const { challenge, payload } = req.body;
  
  if (challenge) {
    return res.json({ challenge });
  }
  
  const { inputFields, recipeId, integrationId } = payload;
  const { message, channel, includeLink } = inputFields;
  
  try {
    // Execute your action logic
    await sendSlackMessage(channel, message, includeLink);
    
    // Return success
    res.json({ success: true });
  } catch (error) {
    // Return error to monday.com
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Function to fire a trigger (notify monday.com that trigger conditions are met)
async function fireTrigger(subscriptionWebhookUrl: string, outputFields: object) {
  await fetch(subscriptionWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trigger: {
        outputFields
      }
    })
  });
}

export default router;
\`\`\`

### Dynamic Field Mapping

Allow users to map board columns to your workflow block inputs:

\`\`\`typescript
{
  "inputFields": [
    {
      "key": "itemName",
      "type": "text",
      "title": "Item Name",
      "fieldMapping": {
        "allowColumnMapping": true,
        "supportedColumnTypes": ["text", "name"]
      }
    },
    {
      "key": "status",
      "type": "column",
      "title": "Status Column",
      "columnTypes": ["status", "dropdown"]
    }
  ]
}
\`\`\`

### Recipe Sentence Patterns

The \`sentence\` field defines how your block appears in the recipe builder:

\`\`\`
// Field placeholders use curly braces
"When {status} changes to {targetValue} in {boardId}"
"Send {message} to {recipient} via {channel}"
"Create a {itemType} in {targetBoard} with name {itemName}"
\`\`\`

---`;

// =============================================================================
// CUSTOM OBJECTS
// =============================================================================
export const CUSTOM_OBJECTS_CONTENT = `## Custom Objects

Custom Objects allow you to extend monday.com's data model with your own entity types. Objects can have relationships with boards, items, and other objects.

### What are Custom Objects?

Custom Objects are app-defined data entities that:
- Live within the monday.com platform
- Can be linked to items, boards, and other objects
- Have their own schema (fields/properties)
- Support CRUD operations via API
- Can be displayed in custom views

### Creating an Object Type

\`\`\`typescript
// Define your object type in the app manifest
{
  "type": "AppFeatureObject",
  "name": "customer",
  "displayName": "Customer",
  "description": "Customer records for CRM integration",
  "schema": {
    "fields": [
      {
        "key": "name",
        "type": "text",
        "title": "Customer Name",
        "required": true
      },
      {
        "key": "email",
        "type": "email",
        "title": "Email Address"
      },
      {
        "key": "company",
        "type": "text",
        "title": "Company"
      },
      {
        "key": "status",
        "type": "dropdown",
        "title": "Status",
        "options": [
          { "value": "lead", "label": "Lead" },
          { "value": "prospect", "label": "Prospect" },
          { "value": "customer", "label": "Customer" },
          { "value": "churned", "label": "Churned" }
        ]
      },
      {
        "key": "revenue",
        "type": "number",
        "title": "Annual Revenue"
      },
      {
        "key": "lastContact",
        "type": "date",
        "title": "Last Contact Date"
      }
    ]
  }
}
\`\`\`

### Object Field Types

| Type | Description | Example |
|------|-------------|---------|
| \`text\` | Plain text | Names, descriptions |
| \`email\` | Email address | Contact emails |
| \`phone\` | Phone number | Contact numbers |
| \`number\` | Numeric value | Revenue, quantity |
| \`date\` | Date value | Dates, timestamps |
| \`dropdown\` | Single select | Status, category |
| \`multi_dropdown\` | Multi select | Tags, labels |
| \`boolean\` | True/false | Flags, toggles |
| \`url\` | Web link | Website, profile |
| \`relationship\` | Link to other objects/items | Parent company |

### CRUD Operations on Objects

\`\`\`typescript
// Create an object instance
const createObject = await monday.api(\`
  mutation {
    create_object(
      object_type: "customer",
      fields: {
        name: "Acme Corp",
        email: "contact@acme.com",
        status: "prospect",
        revenue: 50000
      }
    ) {
      id
      fields
    }
  }
\`);

// Query objects
const getObjects = await monday.api(\`
  query {
    objects(object_type: "customer", limit: 50) {
      id
      fields
      created_at
      updated_at
    }
  }
\`);

// Query with filters
const filteredObjects = await monday.api(\`
  query {
    objects(
      object_type: "customer",
      filters: {
        field: "status",
        operator: "eq",
        value: "customer"
      }
    ) {
      id
      fields
    }
  }
\`);

// Update an object
const updateObject = await monday.api(\`
  mutation {
    update_object(
      object_id: "obj_12345",
      fields: {
        status: "customer",
        revenue: 75000
      }
    ) {
      id
      fields
    }
  }
\`);

// Delete an object
const deleteObject = await monday.api(\`
  mutation {
    delete_object(object_id: "obj_12345") {
      id
    }
  }
\`);
\`\`\`

### Object Relationships

Link objects to items or other objects:

\`\`\`typescript
// Define a relationship field in your schema
{
  "key": "relatedItems",
  "type": "relationship",
  "title": "Related Items",
  "relationshipConfig": {
    "targetType": "item", // 'item' | 'object'
    "targetObjectType": null, // Required if targetType is 'object'
    "cardinality": "many" // 'one' | 'many'
  }
}

// Link an object to items
await monday.api(\`
  mutation {
    link_object_to_items(
      object_id: "obj_12345",
      item_ids: [123, 456, 789]
    ) {
      id
    }
  }
\`);

// Query objects with their relationships
const objectsWithRelations = await monday.api(\`
  query {
    objects(object_type: "customer") {
      id
      fields
      related_items {
        id
        name
        board {
          id
          name
        }
      }
    }
  }
\`);
\`\`\`

### Object Views

Display your objects in a custom view:

\`\`\`typescript
function ObjectListView() {
  const [objects, setObjects] = useState([]);
  
  useEffect(() => {
    fetchObjects();
  }, []);
  
  const fetchObjects = async () => {
    const response = await monday.api(\`
      query {
        objects(object_type: "customer", limit: 100) {
          id
          fields
        }
      }
    \`);
    setObjects(response.data.objects);
  };
  
  return (
    <div className="object-list">
      {objects.map(obj => (
        <div key={obj.id} className="object-card">
          <h3>{obj.fields.name}</h3>
          <p>{obj.fields.email}</p>
          <span className="status">{obj.fields.status}</span>
        </div>
      ))}
    </div>
  );
}
\`\`\`

### Best Practices for Objects

1. **Design schema carefully** - Plan your fields before implementation, as schema changes can affect existing data
2. **Use relationships** - Link objects to items to leverage monday.com's existing UI
3. **Index searchable fields** - Mark frequently searched fields for better query performance
4. **Validate data** - Implement validation in your app before creating/updating objects
5. **Handle pagination** - Use cursors for large object collections

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
monday.setApiVersion('2024-10');

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

### App Management

\`\`\`bash
# Initialize new app
mapps init

# List your apps
mapps app:list

# Get app details
mapps app:info --appId <app_id>
\`\`\`

### Development

\`\`\`bash
# Start local development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
\`\`\`

### Deployment

\`\`\`bash
# Push to monday-code
mapps code:push

# Check deployment status
mapps code:status --appVersionId <version_id>

# View logs
mapps code:logs --appVersionId <version_id>

# Environment variables
mapps code:env:list --appId <app_id>
mapps code:env:set --appId <app_id> --key KEY --value "value"
\`\`\`

### Version Management

\`\`\`bash
# Create new version
mapps app:version:create --appId <app_id>

# Promote to live
mapps app:version:promote --appVersionId <version_id>
\`\`\`

### App Features

\`\`\`bash
# List all features for an app version
mapps app-features:list -a <app_id> -i <version_id>

# Connect monday-code deployment to feature
mapps app-features:build -a <app_id> -i <version_id> -f <feature_id> -d

# Connect with custom build path
mapps app-features:build -a <app_id> -i <version_id> -f <feature_id> -d --buildPath /custom-path
\`\`\`

### Manifest & OAuth Scopes

\`\`\`bash
# Export app manifest (includes OAuth scopes)
mapps manifest:export -a <app_id> -i <version_id>

# Import updated manifest (to update scopes)
mapps manifest:import -p ./manifest.json -a <app_id> -i <version_id>
\`\`\`

**Manifest OAuth section example:**
\`\`\`json
{
  "oauth": {
    "scopes": ["boards:read", "boards:write", "users:read"]
  }
}
\`\`\`

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

${APP_FEATURES_CONTENT}

${VIBE_CONTENT}

${WORKFLOW_BLOCKS_CONTENT}

${CUSTOM_OBJECTS_CONTENT}

${BEST_PRACTICES_CONTENT}

${TROUBLESHOOTING_CONTENT}

${CLI_COMMANDS_CONTENT}

${USEFUL_LINKS_CONTENT}`;

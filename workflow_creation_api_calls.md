# GraphQL API Calls for "Item Creation Workflow" Creation

This document details all the GraphQL API calls made during the creation of the "Item Creation Workflow" that automatically sets the status to "Done" when an item is created on board '9991749309'.

## Overview
- **Workflow Name:** "Auto set Status to Done on Item Creation"
- **Workflow ID:** 7916611818
- **Host Object ID:** 9991844064
- **Target Board:** 9991749309

## API Calls Sequence

### 1. Get Board Information
**Purpose:** Verify the board exists and get its schema details

```graphql
# This was done via the get_board_info tool, which internally uses:
query {
  boards(ids: [9991749309]) {
    id
    name
    description
    state
    board_kind
    url
    updated_at
    item_terminology
    items_count
    items_limit
    board_folder_id
    creator {
      name
      id
      email
    }
    workspace {
      name
      id
      kind
      description
    }
    owners {
      name
      id
    }
    groups {
      title
      id
    }
    top_group {
      id
    }
    columns {
      title
      id
      settings_str
    }
    permissions
  }
}
```

**Response:** Board exists with status column ID `color_mkvjk5rd`

### 2. Create Workflows Host Object
**Purpose:** Create an APP_FEATURE_OBJECT to host the Monday workflow

```graphql
mutation {
  create_object(
    name: "Item Creation Workflow"
    privacy_kind: PUBLIC
    workspace_id: 10137792
    object_type_unique_key: "monday_workflows::workflow"
  ) {
    id
  }
}
```

**Response:** 
```json
{
  "create_object": {
    "id": "9991844064"
  }
}
```

### 3. Fetch Available Workflow Blocks
**Purpose:** Get all available blocks to identify trigger and action blocks

```graphql
query {
  blocks {
    blocks {
      id
      description
      name
      kind
      inputFieldsConfig {
        fieldTitle
        fieldKey
        ... on CustomInputFieldConfig {
          fieldTypeReferenceId
          fieldTypeUniqueKey
          fieldTypeData {
            id
            dependencyConfig{
              optionalFields{
                sourceFieldTypeReferenceId
                sourceFieldTypeUniqueKey
                targetFieldKey
              }
              orderedMandatoryFields{
                sourceFieldTypeReferenceId
                sourceFieldTypeUniqueKey
                targetFieldKey
              }
            }
          }
        }
        ... on PrimitiveInputFieldConfig {
          primitiveType
        }
      }
      outputFieldsConfig {
        fieldTitle
        fieldKey
        ... on CustomOutputFieldConfig {
          fieldTypeReferenceId
          fieldTypeUniqueKey
        }
        ... on PrimitiveOutputFieldConfig {
          primitiveType
        }
      }
    }
  }
}
```

**Key Blocks Identified:**
- Trigger: "When item created" (ID: 10380130)
- Action: "Change status" (ID: 10380126)

### 4. Get Status Column Values via Remote Options
**Purpose:** Fetch available status values for the "Done" status

```graphql
query remote_options {
  remote_options(
    input: {
      field_type_unique_key: "monday::statusColumnValue"
      dependencies_values: {
        boardId: { value: 9991749309 }
        statusColumnId: { value: "color_mkvjk5rd" }
      }
    }
  ) {
    options {
      value
      title
    }
  }
}
```

**Response:**
```json
{
  "remote_options": {
    "options": [
      {"value": null, "title": "Anything"},
      {"value": 0, "title": "Working on it"},
      {"value": 1, "title": "Done"},
      {"value": 2, "title": "Stuck"}
    ]
  }
}
```

**Key Finding:** "Done" status has value `1`

### 5. Get Workflow Variable Schemas
**Purpose:** Understand the structure needed for workflow variables

```graphql
query {
  get_workflow_variable_schemas {
    schema
  }
}
```

**Response:** Detailed JSON schemas for all workflow variable types (user_config, node_results, reference, host_metadata)

### 6. Create Live Workflow
**Purpose:** Create the actual workflow with all configuration

```graphql
mutation {
  create_live_workflow(
    workflow: {
      title: "Auto set Status to Done on Item Creation"
      description: "When an item is created on board 9991749309, automatically set its Status to Done."
      workflowBlocks: [
        {
          workflowNodeId: 1
          blockReferenceId: 10380130
          title: "When item created"
          inputFields: [
            {
              fieldKey: "boardId"
              workflowVariableKey: 1
            }
            {
              fieldKey: "fieldsUsages"
              workflowVariableKey: 5
            }
          ]
          nextWorkflowBlocksConfig: {
            type: "directMapping"
            mapping: {
              nextWorkflowNode: {
                workflowNodeId: 2
              }
            }
          }
        }
        {
          workflowNodeId: 2
          blockReferenceId: 10380126
          title: "Change status"
          inputFields: [
            {
              fieldKey: "boardId"
              workflowVariableKey: 1
            }
            {
              fieldKey: "itemId"
              workflowVariableKey: 2
            }
            {
              fieldKey: "statusColumnId"
              workflowVariableKey: 3
            }
            {
              fieldKey: "statusColumnValue"
              workflowVariableKey: 4
            }
          ]
        }
      ]
      workflowVariables: [
        {
          workflowVariableKey: 1
          sourceKind: "user_config"
          primitiveType: "number"
          sourceMetadata: {
            configurationMetadata: {
              dependencyConfigValues: {}
            }
          }
          config: {
            value: 9991749309
            title: "board from mcp"
          }
        }
        {
          workflowVariableKey: 2
          sourceKind: "node_results"
          appFeatureReferenceId: 10380092
          sourceMetadata: {
            workflowNodeId: 1
            outboundFieldKey: "itemId"
          }
        }
        {
          workflowVariableKey: 3
          sourceKind: "user_config"
          primitiveType: "string"
          sourceMetadata: {
            configurationMetadata: {
              dependencyConfigValues: {
                boardId: { workflowVariableKey: 1 }
              }
            }
          }
          config: {
            value: "color_mkvjk5rd"
            title: "Status"
          }
        }
        {
          workflowVariableKey: 4
          sourceKind: "user_config"
          primitiveType: "number"
          sourceMetadata: {
            configurationMetadata: {
              dependencyConfigValues: {
                boardId: { workflowVariableKey: 1 }
                statusColumnId: { workflowVariableKey: 3 }
              }
            }
          }
          config: {
            value: 1
            title: "Done"
          }
        }
        {
          workflowVariableKey: 5
          sourceKind: "user_config"
          primitiveType: "string"
          sourceMetadata: {
            configurationMetadata: {
              dependencyConfigValues: {}
            }
          }
          config: {
            value: "[]"
            title: "Field usages"
          }
        }
      ]
      workflowHostData: {
        id: "9991844064"
        type: APP_FEATURE_OBJECT
      }
    }
  ) {
    id
  }
}
```

**Response:**
```json
{
  "create_live_workflow": {
    "id": "7916611818"
  }
}
```

## Workflow Variables Explanation

### Variable 1 - Board ID (workflowVariableKey: 1)
- **Type:** user_config
- **Value:** 9991749309 (the target board ID)
- **Usage:** Used by both trigger and action blocks to specify which board

### Variable 2 - Item ID (workflowVariableKey: 2)
- **Type:** node_results
- **Source:** Output from the trigger block (workflowNodeId: 1, outboundFieldKey: "itemId")
- **Usage:** Used by the action block to identify which item to modify

### Variable 3 - Status Column ID (workflowVariableKey: 3)
- **Type:** user_config
- **Value:** "color_mkvjk5rd" (the status column ID)
- **Dependencies:** Depends on boardId (variable 1)
- **Usage:** Used by the action block to specify which column to change

### Variable 4 - Status Value (workflowVariableKey: 4)
- **Type:** user_config
- **Value:** 1 (the "Done" status value)
- **Dependencies:** Depends on boardId (variable 1) and statusColumnId (variable 3)
- **Usage:** Used by the action block to set the status to "Done"

### Variable 5 - Field Usages (workflowVariableKey: 5)
- **Type:** user_config
- **Value:** "[]" (empty array for field usage tracking)
- **Usage:** Used by the trigger block for field usage configuration

## Key Technical Details

1. **Host Type:** APP_FEATURE_OBJECT (makes it a Monday workflow, not board automation)
2. **Block Connection:** Direct mapping from trigger (node 1) to action (node 2)
3. **Dependencies:** Proper dependency configuration ensures runtime resolution of values
4. **Remote Options:** Used to get valid status values instead of hardcoding

## Result
Successfully created workflow ID `7916611818` that automatically sets item status to "Done" when items are created on board `9991749309`.

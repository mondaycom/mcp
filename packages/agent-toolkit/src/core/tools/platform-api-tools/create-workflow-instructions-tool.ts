import { ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export class CreateWorkflowInstructionsTool extends BaseMondayApiTool<Record<string, never>> {
  name = 'create_workflow_instructions';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Create Workflow Instructions',
  });
  getDescription(): string {
    return `When the user asks to create a workflow or automation, you must use this tool, which provides instructions on how to create a workflow.
    This tool is very important and should be used when the user explicitly requests:
    - Workflow creation (e.g., "create a monday workflow", "create a new workflow").
    - Automation (e.g., "automate this process", "when item is created, set status to done")
    `;
  }

  getInputSchema(): Record<string, never> {
    return {};
  }

  protected async executeInternal(): Promise<ToolOutputType<never>> {
    const instructions = `
# Instructions to Create a Live Workflow

## General Explanation:
- A workflow is a structured sequence of actions and conditions and triggers (blocks) designed to automate processes (for example, trigger -> action -> action -> ...).
- A block is a reusable logic unit; it can be a trigger, condition or action. It has input fields and output fields.
- A workflow block wraps a block (the underlying logic unit), providing the configuration for its input fields and defining how it connects to other blocks in the workflow graph.
- A workflow variable presents a value that is used in the workflow block. It has a unique key, a value, and dependencies.
It can be a result of a previous block, a user config, a reference, or a host metadata.
If it is a user config, you have to get the possible values for the value from remote options query.

To create a live workflow in monday.com, follow these steps:

## Step 0: Determine and Ensure Host Exists (CRITICAL FIRST STEP)

**Every workflow MUST be attached to an existing host entity.** Before creating any workflow, you must:

### 0.1 Identify the Host Type Based on User Request

**IMPORTANT: The host type depends on what the user is asking for:**

- **If user wants "monday workflows"** (e.g., "create a monday workflow") ALWAYS USE THIS HOST TYPE:
  - Host type: **APP_FEATURE_OBJECT** 
  - This is the standalone Workflows product
  - User explicitly mentions "monday workflow" or "workflow" without board context
  
- **If user wants "automation"** (e.g., "automate when item is created", "set status automatically"):
  - Host type: **BOARD**
  - The automation will run on a specific board
  - User typically mentions board-related triggers/actions and the workflow is pretty simple

### 0.2 Check if Host Exists
**Always check first before creating:**

**For BOARD hosts (automations):**
\`\`\`
query {
  boards(ids: [BOARD_ID]) {
    id
    name
  }
}
\`\`\`
If user didn't specify a board, you may need to ask which board or list available boards.

**For APP_FEATURE_OBJECT hosts (monday workflows):**
Check if a workflows object exists for the user/workspace. The exact query depends on the API structure for workflows objects.

### 0.3 Create Host if Missing
**Only if the host doesn't exist, create it first:**

**For BOARD hosts:**
\`\`\`
mutation {
  create_board(
    board_name: "Board Name",
    board_kind: public
  ) {
    id
  }
}
\`\`\`

**For APP_FEATURE_OBJECT hosts:**
\`\`\`
mutation {
  create_workflows_object(
    name: "Workflow Name"
  ) {
    id
  }
}
\`\`\`

### 0.4 Prepare workflowHostData
Once you have confirmed the host exists (or created it), prepare the \`workflowHostData\` object:

**For automations (board host):**
\`\`\`
workflowHostData: {
  id: "BOARD_ID_HERE",
  type: BOARD
}
\`\`\`

**For monday workflows (app feature host):**
\`\`\`
workflowHostData: {
  id: "WORKFLOWS_OBJECT_ID_HERE",
  type: APP_FEATURE_OBJECT
}
\`\`\`

**⚠️ IMPORTANT: Do not proceed to the next steps until the host is confirmed to exist and you have its ID.**

## Step 1: Fetch Available Blocks

Fetch the blocks including the input fields config using monday api:
Each block represents a trigger, condition or action. Blocks can have input fields and output fields.
In general, you can understand what a block does by its description or name.
The "kind" field in the block represents the type of the block (trigger, condition or action).
There are some types of input fields: In the case of CustomInputField, it refers to a field type feature. 
It has special functionality — for example, remote options. These are all the possible values for this type. 
For example, if the field type is 'board', then the options will include a list of all boardIds 
Their identifier is the 'fieldTypeReferenceId' (or 'id' in the fieldTypeData).
There are dependencies that tell us what values we need to know to fetch the options for the custom input field's value.
For example, if the custom input field is a status column, the dependency is the board ID.

**Example query to fetch the blocks:**
\`\`\`
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
    }
  }
}
\`\`\`

## Step 2: Choose Blocks

Choose the trigger block and action blocks that you want to use based on the user's automation requirements.

## Step 3: Build Workflow Schema

Get the input schema of the 'create_live_workflow' mutation.
Pay attention that sometimes you need to run queries to fetch some schemas. Read the description of each field in the schema and follow the instructions if there are any.

## Step 4: Build Workflow Block Schemas

For each block you choose to use, build the workflow block schema (start from the trigger block):
- **4.a.** For each input field, build the workflow variable schema and use it in the workflow block.
- **4.b.** For each output field, build the workflow variable schema and use it in the workflow block.

## Step 5: Retrieve allowed constant values for input fields (remote_options)

Sometimes you need to configure an input field with a fixed (constant) value.

1. Examine the block's inputFieldsConfig.
   • If the field type is PrimitiveInputFieldConfig – you can pass any literal that matches its primitiveType.
   • If the field type is CustomInputFieldConfig – its allowed values are dynamic. You **MUST** fetch them using the remote_options query.

2. Build the remote_options query for every CustomInputFieldConfig you want to set as a constant:
   • Provide the field_type_unique_key of the field.
   • Fill the dependencies_values object with **all mandatory dependencies** listed in fieldTypeData.dependencyConfig.orderedMandatoryFields. You can supply each dependency as a literal value (value) or as a reference to an existing workflow variable (workflowVariableKey).

3. Select the desired option from the query response (options.value / options.title) and store it in a USER_CONFIG workflow variable that will be referenced by the input field.

**Example:**
\`\`\`graphql
query remote_options {
  remote_options(
    input: {
      field_type_unique_key: 'monday:status_column'
      dependencies_values: {
        boardId: { value: 118607562 }
      }
    }
  ) {
    options {
      value
      title
    }
  }
}
\`\`\`

## ⚠️ Common Pitfalls

### Pitfall #1: Skipping remote_options for Custom Fields
- **Problem:** Using hardcoded values for groups, status columns, people columns
- **Impact:** Workflow fails silently or uses wrong entities
- **Solution:** Always call \`remote_options\` for CustomInputField types

### Pitfall #2: Missing Dependency Values  
- **Problem:** Not providing all required \`dependencyConfigValues\`
- **Impact:** API returns empty options or errors
- **Solution:** Check \`dependencyConfig.orderedMandatoryFields\` and supply all

### Pitfall #3: Wrong Host Type
- **Problem:** Using BOARD host for "monday workflows" or APP_FEATURE_OBJECT for "automations"
- **Impact:** Workflow created in wrong context
- **Solution:** Follow Step 0.1 decision tree strictly

### Pitfall #4: Hardcoded Field Type IDs
**Common field types that REQUIRE remote_options:**
- \`10380085\` → Groups (depends on boardId)
- \`10380084\` → Status columns (depends on boardId)  
- \`10380073\` → People columns (depends on boardId)
- \`10380094\` → Status values (depends on boardId + statusColumnId)

**Never hardcode values for these field types!**

### Pitfall #5: Missing appFeatureReferenceId in Workflow Variables
- **Problem:** When a workflow variable references an app feature (e.g. a custom inbound field), forgetting to include \`appFeatureReferenceId\`
- **Impact:** Can cause issues serializing the workflow variable
- **Solution:** Always populate \`appFeatureReferenceId\` when the variable references an app feature, even if it has a primitiveType

## Step 6: Fetch Complete Workflow Variable Schemas

Fetch the complete workflow variables schemas with the query 'get_workflow_variable_schemas'. In general, there are 4 types of workflow variables:
Each workflow variable has a workflowVariableKey (unique) that is used to identify the variable in the workflow block and a sourceKind (NODE_RESULT, USER_CONFIG, REFERENCE, HOST_METADATA).

**Critical:** When the variable is of **USER_CONFIG** kind and its value was selected via the **remote_options** query (see Step 5), the **exact same dependency key-value pairs** you passed to remote_options **must be placed in** \`sourceMetadata.configurationMetadata.dependencyConfigValues\`. This guarantees the workflow engine can resolve the value at runtime.

- **6.a. Node result:** A variable that has a value fetched from output fields of the previous block.
  **Example:**
\`\`\`
{
  workflowVariableKey: 2,
  sourceKind: "node_results",
  appFeatureReferenceId: <item_field_type_appFeatureReferenceId>,
  sourceMetadata: {
    workflowNodeId: 1,
    outboundFieldKey: "itemId"
  }
}
\`\`\`

- **6.b. User config:** A variable that has a value fetched from the user config (if the user config is a remote option, you need to use the remote options query).
  **Very important:** You need to make sure that all the dependencies of the field type (dependencyConfigValues) are filled in the sourceMetadata (see the schema).
  **Example:**
\`\`\`
{
    workflowVariableKey: 4,
    sourceKind: "user_config",
    appFeatureReferenceId: <appFeatureReferenceId>,
    sourceMetadata: {
      configurationMetadata:{
        dependencyConfigValues:{
          boardId: {workflowVariableKey: 1},
          statusColumnId:{workflowVariableKey: 3},
          itemId:{workflowVariableKey: 2}
        }
      }
    },
    primitiveType: "number",
    config: {
      value: 1,
      title: "Done"
    }
  }
\`\`\`

- **6.c. Reference:** A variable that has a value fetched from a reference (if the reference is a remote option, you need to use the remote options query).

- **6.d. Host metadata:** A variable that has a value fetched from the host metadata. For example: board ID when the host is a board.
  **Example:**
\`\`\`
{
  workflowVariableKey: 1,
  sourceKind: "host_metadata",
  sourceMetadata: {
    hostMetadataKey: "hostInstanceId"
  }
}
\`\`\`

### 6.5: Validation Checklist for Workflow Variables

**MANDATORY: Before proceeding to Step 7, validate each workflow variable:**

For every **user_config** workflow variable:
- [ ] Does \`fieldTypeReferenceId\` exist?
- [ ] If yes → Is this a CustomInputField with \`dependencyConfig\`?
- [ ] If yes → Did you call \`remote_options\` query with ALL required dependencies?
- [ ] Did you use an actual \`value\` from the \`remote_options\` response (not a hardcoded string)?
- [ ] Are all \`dependencyConfigValues\` properly referenced by \`workflowVariableKey\`?

## Step 7: Create the Live Workflow

Create the live workflow with the query 'create_live_workflow', using the workflow variables and workflow blocks in the input.

**Example for board automation:**
\`\`\`
mutation {
  create_live_workflow(
   
  workflow: {
    title: "Auto set Status to Done on item creation",
    description: "When an item is created, automatically set its Status to Done.",

    workflowBlocks: [
      {
        workflowNodeId: 1,
        blockReferenceId: 10380130,
        title: "When item created",
        inputFields: [
          {
            fieldKey: "boardId",
            workflowVariableKey: 1
          }
        ],
        nextWorkflowBlocksConfig: {
          type: "directMapping",
          mapping: {
            nextWorkflowNode: {
              workflowNodeId: 2
            }
          }
        }
      },
      {
        workflowNodeId: 2,
        blockReferenceId: 10380126,
        title: "Change status",
        inputFields: [
          {
            fieldKey: "boardId",
            workflowVariableKey: 1
          },
          {
            fieldKey: "itemId",
            workflowVariableKey: 2
          },
          {
            fieldKey: "statusColumnId",
            workflowVariableKey: 3
          },
          {
            fieldKey: "statusColumnValue",
            workflowVariableKey: 4
          }
        ]
      }
    ],

    workflowVariables: [
      {
        workflowVariableKey: 1,
        sourceKind: "host_metadata",
        sourceMetadata: {
          hostMetadataKey: "hostInstanceId"
        }
      },
      {
        workflowVariableKey: 2,
        sourceKind: "node_results",
        appFeatureReferenceId: <item_field_type_appFeatureReferenceId>,
        sourceMetadata: {
          workflowNodeId: 1,
          outboundFieldKey: "itemId"
        }
      },
      {
        workflowVariableKey: 3,
        sourceKind: "user_config",
        appFeatureReferenceId: <appFeatureReferenceId>,
        sourceMetadata: {
          configurationMetadata:{
            dependencyConfigValues:{
              boardId: {workflowVariableKey: 1},
              itemId: {workflowVariableKey: 2}
            }
          }
        },
        primitiveType: "string",
        config: {
          value: "status",
          title: "Status"
        }
      },
      {
        workflowVariableKey: 4,
        sourceKind: "user_config",
        appFeatureReferenceId: <appFeatureReferenceId>,
        sourceMetadata: {
          configurationMetadata:{
            dependencyConfigValues:{
              boardId: {workflowVariableKey: 1},
              statusColumnId:{workflowVariableKey: 3},
              itemId:{workflowVariableKey: 2}
            }
          }
        },
        primitiveType: "number",
        config: {
          value: 1,
          title: "Done"
        }
      }
    ],

    workflowHostData: {
      id: "118607562",
      type: BOARD
    }
  }

  ) {
    id
  }
}
\`\`\`

## Summary Checklist:
1. ✅ Determine if user wants automation (BOARD host) or monday workflows (APP_FEATURE_OBJECT host)
2. ✅ Check if the appropriate host exists  
3. ✅ Create host if missing
4. ✅ Prepare workflowHostData with correct host type and ID
5. ✅ Fetch available blocks
6. ✅ Choose appropriate blocks
7. ✅ Build workflow schema
8. ✅ Configure workflow variables
9. ✅ Create the live workflow

## Quick Reference:
- **"Automate X"** → BOARD host
- **"Create monday workflow"** → APP_FEATURE_OBJECT host
`;

    return {
      content: instructions.trim(),
    };
  }
}

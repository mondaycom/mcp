import { ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool } from './base-monday-api-tool';

export class GetInstructionsToCreateLiveWorkflowTool extends BaseMondayApiTool<Record<string, never>> {
  name = 'get_instructions_to_create_live_workflow';
  type = ToolType.READ;

  getDescription(): string {
    return `When the user asks to create a workflow, you must use this tool, which provides instructions on how to create a workflow.
    This tool is very important and should be used only when the user asks to create a workflow.
    In general, create live workflows when the user asks you to do something automatically on monday.com items or boards.
    For example: when an item is created, set the status to done`;
  } 

  getInputSchema(): Record<string, never> {
    return {};
  }

  async execute(): Promise<ToolOutputType<never>> {
    const instructions = `
# Instructions to Create a Live Workflow

## General Explanation:
- A workflow is a set of blocks that are connected to each other (trigger → action → action → ...).
- A block is a step in the workflow; it can be a trigger or an action. It has input fields and output fields.
- A workflow block is a configuration of a block. It has a block reference ID, input fields, and output fields.
- A workflow variable is a variable that is used in the workflow. It has a unique key, a value, and dependencies.
- To fill the value of a variable, you need to use the remote options query.
- Workflow host data contains the data of the workflow's host. It has an ID and a type.

To create a live workflow in monday.com, follow these steps:

1. **Fetch the blocks including the input fields config:**
   Each block represents an action or a trigger. Some blocks have input fields and some have output fields.
   In general, you can understand what a block does by its description or name.
   The "kind" field in the block represents the type of the block (trigger or action).

   'Custom input fields' represent parameters that are declared as field type app features. Their identifier is the 'fieldTypeReferenceId' (or 'id' in the fieldTypeData).
   There are dependencies that tell us what values we need to know to fetch the options for the custom input field's value.
   For example, if the custom input field is a status column, the dependency is the board ID.

   **Example query:**
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
          fieldTypeData {
            id
            dependencyConfig{
              optionalFields{
                sourceFieldTypeReferenceId
                targetFieldKey
              }
              orderedMandatoryFields{
                sourceFieldTypeReferenceId
                targetFieldKey
              }
              
            }
          }
        }
        ... on PrimitiveInputFieldConfig {
          primitiveType
        }
        ... on InterfaceInputFieldConfig{
          type
          subfieldName
          constraints{
            remoteOptionsDependencies
            dependencies
            subFieldsDependencies
            credentials
          }
        }
      }
    }
  }
}

2. **Choose the trigger block and action blocks** that you want to use.

3. **Build the workflow schema.** Get the input schema of the 'create_live_workflow' mutation.
   Pay attention that sometimes you need to run queries to fetch some schemas. Please read the description and follow the instructions if there are any.

4. **For each block you choose to use, build the workflow block schema** (start from the trigger block):
   - **4.a.** For each input field, build the workflow variable schema and use it in the workflow block.
   - **4.b.** For each output field, build the workflow variable schema and use it in the workflow block.

5. **To build workflow variables,** use the 'remote_options' query when the input field is a custom input field type with remote options.
   Fetch the remote options query schema and the remote options query input schema, then run the query.

   **Example:**
query remote_options {
  remote_options( input: {
    fieldTypeReferenceId: 10380084,
    dependenciesValues: {
        boardId:{
        value: 118607562
      }
  }
  }) {
    options{
      value
      title
    }
  }
}
6. **Fetch the complete workflow variables schemas** with the query 'get_workflow_variable_schemas'. In general, there are 4 types of workflow variables:
   Each workflow variable has a workflowVariableKey (unique) that is used to identify the variable in the workflow block and a sourceKind (NODE_RESULT, USER_CONFIG, REFERENCE, HOST_METADATA).

   - **6.a. Node result:** A variable that has a value fetched from output fields of the previous block.
     **Example:**
{
  workflowVariableKey: 2,
  sourceKind: "node_results",
  sourceMetadata: {
    workflowNodeId: 1,
    outboundFieldKey: "itemId"
  }
},
   - **6.b. User config:** A variable that has a value fetched from the user config (if the user config is a remote option, you need to use the remote options query).
     **Very important:** You need to make sure that all the dependencies of the field type (dependenciesValues) are filled in the sourceMetadata (see the schema).
     **Example:**
{
    workflowVariableKey: 4,
    sourceKind: "user_config",
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
   - **6.c. Reference:** A variable that has a value fetched from a reference (if the reference is a remote option, you need to use the remote options query).

   - **6.d. Host metadata:** A variable that has a value fetched from the host metadata. For example: board ID when the host is a board.
     **Example:**
{
  workflowVariableKey: 1,
  sourceKind: "host_metadata",
  sourceMetadata: {
    hostMetadataKey: "hostInstanceId"
  }
}
7. **Create the live workflow** with the query 'create_live_workflow', using the workflow variables and workflow blocks in the input.

   **Example:**
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
        sourceMetadata: {
          workflowNodeId: 1,
          outboundFieldKey: "itemId"
        }
      },
      {
        workflowVariableKey: 3,
        sourceKind: "user_config",
 sourceMetadata: {
          configurationMetadata:{
            dependencyConfigValues:{
              boardId: {workflowVariableKey: 1},
              itemId: {workflowVariableKey: 2}
            }
          }
        },        primitiveType: "string",
        config: {
          value: "status",
          title: "Status"
        }
      },
      {
        workflowVariableKey: 4,
        sourceKind: "user_config",
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
`;

    return {
      content: instructions.trim(),
    };
  }
}

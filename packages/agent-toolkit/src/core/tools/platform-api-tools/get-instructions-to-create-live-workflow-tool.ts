import { ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool } from './base-monday-api-tool';

export class GetInstructionsToCreateLiveWorkflowTool extends BaseMondayApiTool<Record<string, never>> {
  name = 'get_instructions_to_create_live_workflow';
  type = ToolType.READ;

  getDescription(): string {
    return `When the user asks to create a workflow, you must use this tool, it will give you an instruction on how to create a workflow.
    This tool is very important and should be used only if the user asks to create a workflow.
    In general, create live workflow when the user asks you to do something automatic on monday.com item or board.
    for example: when an item is created, set the status to done`;
  } 

  getInputSchema(): Record<string, never> {
    return {};
  }

  async execute(): Promise<ToolOutputType<never>> {
    const instructions = `
# Instructions to Create a Live Workflow
General explanation:
- A workflow is a set of blocks that are connected to each other (trigger -> action -> action -> ...).
- A block is a step in the workflow, it can be a trigger or an action. it has input fields and output fields.
- Workflow block is a configuration of a block, it has a block reference id, input fields and output fields.
- Workflow variable is a variable that is used in the workflow. it has a key(unique), a value and the dependencies.
- For fill the value of a variable, you need to use the remote options query.
- Workflow host data is the data of the host of the workflow. it has an id and a type.

To create a live workflow in monday.com, follow these steps:

1. Fetch the blocks including the input fields config:
each block present an action or a trigger, some blocks have input fields and some blocks have output fields.
In general, you can understand by the description or the name of the block what it does.
And the kind in the block is present the type of the block (trigger or action).

'custom input fields' presents parameter that declare as field type app feature. It's identifier is the 'fieldTypeReferenceId' (or 'id' in the fieldTypeData).
There are dependency that tell us what are the values we need to know for catch the options of the value of the custom input field.
For example, if the custom input field is a status column, the dependency is the board id.

example of the query:
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

2. Choose the trigger block and the action blocks that you want to use.
3. Now you need to build the workflow schema. Please get the input schema of the 'create_live_workflow' mutation.
Pay attention that sometimes you need to run the query for fetch some schemas. So please read the description and follow the instructions if there are some instructions.
4. For each block you choose to use, you need to build the workflow block schema (start from the trigger block):
4.a. For each input field, you need to build the workflow variable schema, and use it in the workflow block.
4.b. For each output field, you need to build the workflow variable schema, and use it in the workflow block.
5. For build workflow variables, you need to use the 'remote_options' query when the input field is a custom input field type with remote options.
Fetch the remote options query schema and the remote options query input schema, and then run the query.
example:
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
6. You need to fetch the whole workflow variables schemas with the query 'get_workflow_variable_schemas', in generall there are 4 types of workflow variables:
each workflow variable has a workflowVariableKey (unique) that is used to identify the variable in the workflow block and a sourceKind (NODE_RESULT, USER_CONFIG, REFERENCE, HOST_METADATA).
6.a. node result: a variable that has a value that is fetched from output fields of the previous block.
example:
{
  workflowVariableKey: 2,
  sourceKind: "node_results",
  sourceMetadata: {
    workflowNodeId: 1,
    outboundFieldKey: "itemId"
  }
},
6.b. user config: a variable that has a value that is fetched from the user config (if the user config is a remote option, you need to use the remote options query).
very important thing: you need to make sure that all the dependencies of the field type (dependenciesValues) are filled in the sourceMetadata (see the schema).
example:
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
6.c. reference: a variable that has a value that is fetched from a reference (if the reference is a remote option, you need to use the remote options query).
6.d. host metadata: a variable that has a value that is fetched from the host metadata for example: board id when the host is a board.
example:
{
  workflowVariableKey: 1,
  sourceKind: "host_metadata",
  sourceMetadata: {
    hostMetadataKey: "hostInstanceId"
  }
}
7. You need to create the live workflow with the query 'create_live_workflow', and use the workflow variables and the workflow blocks in the input.
for example:
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
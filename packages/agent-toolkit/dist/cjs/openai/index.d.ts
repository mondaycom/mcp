import { ChatCompletionTool, ChatCompletionMessageToolCall, ChatCompletionToolMessageParam } from 'openai/resources';
import { ZodRawShape, z, ZodTypeAny } from 'zod';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types';
import { ApiClientConfig } from '@mondaydotcomorg/api';

interface Executable<Input, Output> {
    execute: (input?: Input) => Promise<Output>;
}

type ToolInputType<Input extends ZodRawShape | undefined> = Input extends ZodRawShape ? z.objectOutputType<Input, ZodTypeAny> : undefined;
type ToolOutputType<T extends Record<string, unknown>> = {
    content: string;
    metadata?: T;
};
declare enum ToolType {
    READ = "read",
    WRITE = "write",
    ALL_API = "all_api"
}
interface Tool<Input extends ZodRawShape | undefined, Output extends Record<string, unknown> = never> extends Executable<ToolInputType<Input>, ToolOutputType<Output>> {
    name: string;
    type: ToolType;
    annotations: ToolAnnotations;
    /** Whether the tool is enabled by default. Defaults to true if not specified. */
    enabledByDefault?: boolean;
    getDescription(): string;
    getInputSchema(): Input;
}

declare enum ToolMode {
    API = "api",
    APPS = "apps"
}
type ToolsConfiguration = {
    include?: string[];
    exclude?: string[];
    readOnlyMode?: boolean;
    mode?: ToolMode;
    enableDynamicApiTools?: boolean | 'only';
    enableToolManager?: boolean;
};
type MondayAgentToolkitConfig = {
    mondayApiToken: ApiClientConfig['token'];
    mondayApiVersion?: ApiClientConfig['apiVersion'];
    mondayApiRequestConfig?: ApiClientConfig['requestConfig'];
    toolsConfiguration?: ToolsConfiguration;
};

declare class MondayAgentToolkit {
    private readonly mondayApi;
    private readonly mondayApiToken;
    tools: Tool<any, any>[];
    constructor(config: MondayAgentToolkitConfig);
    /**
     * Initialize both API and CLI tools
     */
    private initializeTools;
    /**
     * Returns the tools that are available to be used in the OpenAI API.
     *
     * @returns {ChatCompletionTool[]} The tools that are available to be used in the OpenAI API.
     */
    getTools(): ChatCompletionTool[];
    /**
     * Processes a single OpenAI tool call by executing the requested function.
     *
     * @param {ChatCompletionMessageToolCall} toolCall - The tool call object from OpenAI containing
     *   function name, arguments, and ID.
     * @returns {Promise<ChatCompletionToolMessageParam>} A promise that resolves to a tool message
     *   object containing the result of the tool execution with the proper format for the OpenAI API.
     */
    handleToolCall(toolCall: ChatCompletionMessageToolCall): Promise<ChatCompletionToolMessageParam>;
}

export { MondayAgentToolkit };

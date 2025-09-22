import { ZodRawShape, z, ZodTypeAny } from 'zod';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types';
import { ApiClient, ApiClientConfig } from '@mondaydotcomorg/api';

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

type MondayApiToolContext = {
    boardId?: number;
};
type BaseMondayApiToolConstructor = new (api: ApiClient, token?: string) => BaseMondayApiTool<any>;
declare abstract class BaseMondayApiTool<Input extends ZodRawShape | undefined, Output extends Record<string, unknown> = never> implements Tool<Input, Output> {
    protected readonly mondayApi: ApiClient;
    protected readonly apiToken?: string | undefined;
    protected readonly context?: MondayApiToolContext | undefined;
    abstract name: string;
    abstract type: ToolType;
    abstract annotations: ToolAnnotations;
    enabledByDefault?: boolean;
    constructor(mondayApi: ApiClient, apiToken?: string | undefined, context?: MondayApiToolContext | undefined);
    abstract getDescription(): string;
    abstract getInputSchema(): Input;
    /**
     * Public execute method that automatically tracks execution
     */
    execute(input?: ToolInputType<Input>): Promise<ToolOutputType<Output>>;
    /**
     * Abstract method that subclasses should implement for their actual logic
     */
    protected abstract executeInternal(input?: ToolInputType<Input>): Promise<ToolOutputType<Output>>;
    /**
     * Tracks tool execution with timing and error information
     * @param toolName - The name of the tool being executed
     * @param executionTimeInMs - The time taken to execute the tool in milliseconds
     * @param isError - Whether the execution resulted in an error
     * @param params - The parameters passed to the tool
     */
    private trackToolExecution;
}

declare const allMondayAppsTools: (new (...args: any[]) => Tool<any, any>)[];

declare const allGraphqlApiTools: BaseMondayApiToolConstructor[];

declare const allTools: ((new (...args: any[]) => Tool<any, any>) | BaseMondayApiToolConstructor)[];

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

export { Executable, MondayAgentToolkitConfig, Tool, ToolInputType, ToolMode, ToolOutputType, ToolType, ToolsConfiguration, allGraphqlApiTools, allMondayAppsTools, allTools };

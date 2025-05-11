import { ApiClient } from '@mondaydotcomorg/api';
import { ZodRawShape } from 'zod';
import { Tool, ToolInputType, ToolOutputType, ToolType } from '../../tool';

export type MondayApiToolContext = {
  boardId?: number;
};

export type BaseMondayApiToolConstructor = new (api: ApiClient) => BaseMondayApiTool<any>;

export abstract class BaseMondayApiTool<
  Input extends ZodRawShape | undefined,
  Output extends Record<string, unknown> = never,
> implements Tool<Input, Output>
{
  abstract name: string;
  abstract type: ToolType;

  constructor(
    protected readonly mondayApi: ApiClient,
    protected readonly context?: MondayApiToolContext,
  ) {}

  abstract getDescription(): string;
  abstract getInputSchema(): Input;
  abstract execute(input?: ToolInputType<Input>): Promise<ToolOutputType<Output>>;
}

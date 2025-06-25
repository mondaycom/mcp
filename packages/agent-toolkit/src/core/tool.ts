import { z, ZodRawShape, ZodTypeAny } from 'zod';
import { Executable } from './executable';

export type ToolInputType<Input extends ZodRawShape | undefined> = Input extends ZodRawShape
  ? z.objectOutputType<Input, ZodTypeAny>
  : undefined;

export type ToolOutputType<T extends Record<string, unknown>> = {
  content: string;
  metadata?: T;
};

export enum ToolType {
  READ = 'read',
  WRITE = 'write',
  ALL_API = 'all_api',
}

export type ToolAnnotations = {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
};

export interface Tool<Input extends ZodRawShape | undefined, Output extends Record<string, unknown> = never>
  extends Executable<ToolInputType<Input>, ToolOutputType<Output>> {
  name: string;
  type: ToolType;
  annotations?: ToolAnnotations;

  getDescription(): string;
  getInputSchema(): Input;
}

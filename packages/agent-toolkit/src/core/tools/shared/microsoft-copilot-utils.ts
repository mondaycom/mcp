import { ToolInputType } from "src/core/tool";
import { ZodRawShape, ZodSchema } from "zod";

/**
 * Parses a stringified JSON field and assigns it to another field in the input object.
 * This is useful for handling Microsoft Copilot's stringified parameters.
 * 
 * @param input - The input object containing the fields
 * @param jsonKey - The key where the parsed JSON should be assigned (must be a valid key of input)
 * @param stringifiedJsonKey - The key containing the stringified JSON (must be a valid key of input)
 * 
 * Type safety: The generic parameter TInput is inferred from the input parameter,
 * ensuring that jsonKey and stringifiedJsonKey are actual keys of the input object.
 */
export const fallbackToStringifiedVersionIfNull = <
  TInput extends ToolInputType<ZodRawShape>,
  K extends keyof TInput = keyof TInput
>(
  input: TInput,
  jsonKey: K,
  schema: ZodSchema
) => {
  const stringifiedJsonKey = `${String(jsonKey)}${STRINGIFIED_SUFFIX}`;
  if (input[jsonKey] || !input[stringifiedJsonKey]) {
    return;
  }

  let parsedResult: any;
  try {
    parsedResult = JSON.parse(input[stringifiedJsonKey] as string);
  } catch {
    throw new Error(`${String(stringifiedJsonKey)} is not a valid JSON`);
  }

  // Copilot might send data object directly e.g { ... } or wrap it in anobject with jsonKey as key e.g. { jsonKey: { ... } }
  const didCopilotWrapTheObject = jsonKey in parsedResult && Object.keys(parsedResult).length === 1;
  const data = didCopilotWrapTheObject ? parsedResult[jsonKey] : parsedResult;

  const parseResult = schema.safeParse(data);
  if(!parseResult.success) {
    throw new Error(`JSON string defined as ${String(stringifiedJsonKey)} does not match the specified schema`);
  }

  (input as any)[jsonKey] = parseResult.data;
};

export const STRINGIFIED_SUFFIX = 'Stringified';
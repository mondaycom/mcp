import { ToolInputType } from "src/core/tool";
import { ZodRawShape, ZodSchema } from "zod";

export const STRINGIFIED_SUFFIX = 'Stringified' as const;

/**
 * Extract keys from an object that have a corresponding "Stringified" version.
 * For example, if the object has both `form` and `formStringified`, then 'form' is extracted.
 */
type KeysWithStringifiedVersion<T> = {
  [K in keyof T]: K extends string 
    ? `${K}${typeof STRINGIFIED_SUFFIX}` extends keyof T 
      ? K 
      : never
    : never
}[keyof T];

/**
 * Parses a stringified JSON field and assigns it to another field in the input object.
 * This is useful for handling Microsoft Copilot's stringified parameters.
 * 
 * @param input - The input object containing the fields
 * @param jsonKey - The key where the parsed JSON should be assigned (must have a corresponding stringified version)
 * @param schema - The Zod schema to validate the parsed JSON against
 * 
 * Type safety: Only keys that have a corresponding `${key}Stringified` property can be passed as jsonKey.
 * For example, if input has `form` and `formStringified`, you can pass 'form' as jsonKey.
 */
export const fallbackToStringifiedVersionIfNull = <
  TInput extends ToolInputType<ZodRawShape>,
  K extends KeysWithStringifiedVersion<TInput> = KeysWithStringifiedVersion<TInput>
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
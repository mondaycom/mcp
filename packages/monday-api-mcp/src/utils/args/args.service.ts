import { ParsedArgs, ValidatedArgs } from './args.types.js';
import { ARG_CONFIGS } from './args.config.js';

/**
 * Parse command line arguments based on the defined configurations
 * Also checks environment variables if command line args are not provided
 * @param args Command line arguments (process.argv.slice(2))
 * @returns Object with parsed arguments
 */
export function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {};

  ARG_CONFIGS.forEach((config) => {
    let argValue: string | undefined;

    // Try to get value from command line arguments
    for (const flag of config.flags) {
      const flagIndex = args.findIndex((arg) => arg === flag);
      if (flagIndex !== -1 && flagIndex + 1 < args.length) {
        argValue = args[flagIndex + 1];
        break;
      }
    }

    // If not found in command line args, try environment variables
    if (argValue === undefined) {
      const envVarName = `MONDAY_${config.name.toUpperCase()}`;
      if (process.env[envVarName]) {
        argValue = process.env[envVarName];
      }
    }

    // If still not found, use default value if provided
    if (argValue === undefined && config.defaultValue !== undefined) {
      argValue = String(config.defaultValue);
    }

    result[config.name] = argValue;
  });

  return result;
}

/**
 * Validates required arguments and displays error messages for missing ones
 * @param parsedArgs The parsed arguments to validate
 * @returns Strongly typed validated arguments
 */
export function validateArgs(parsedArgs: ParsedArgs): ValidatedArgs {
  const missingArgs = ARG_CONFIGS.filter((config) => config.required && !parsedArgs[config.name]);

  if (missingArgs.length > 0) {
    console.error('Error: The following required arguments are missing:');

    missingArgs.forEach((config) => {
      console.error(`  - ${config.name}: ${config.description}`);
      console.error('    You can provide it using:');

      const flagsString = config.flags.join(' or ');
      console.error(`     ${flagsString} command line argument`);
    });

    process.exit(1);
  }

  const typedArgs: Record<string, any> = { ...parsedArgs };

  ARG_CONFIGS.forEach((config) => {
    if (typeof config.defaultValue === 'boolean' && parsedArgs[config.name] !== undefined) {
      const stringValue = parsedArgs[config.name] as string;

      // Special handling for enableDynamicApiTools to support "only" option
      if (config.name === 'enableDynamicApiTools' && stringValue.toLowerCase() === 'only') {
        typedArgs[config.name] = 'only';
      } else {
        typedArgs[config.name] = stringValue.toLowerCase() === 'true';
      }
    }
  });

  return typedArgs as unknown as ValidatedArgs;
}

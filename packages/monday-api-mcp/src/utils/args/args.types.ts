export interface ArgConfig {
  name: string;
  flags: string[];
  description: string;
  required?: boolean;
  defaultValue?: unknown;
}

export interface ParsedArgs {
  [key: string]: string | undefined;
}

export interface ValidatedArgs {
  token: string;
  version: string;
  readOnlyMode: boolean;
  enableDynamicApiTools: boolean | 'only';
}

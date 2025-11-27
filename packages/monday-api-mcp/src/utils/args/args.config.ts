import { ArgConfig } from './args.types.js';

export const ARG_CONFIGS: ArgConfig[] = [
  {
    name: 'token',
    flags: ['--token', '-t'],
    description: 'Monday API token',
    required: true,
  },
  {
    name: 'version',
    flags: ['--version', '-v'],
    description: 'Monday API version',
    required: false,
    defaultValue: undefined,
  },
  {
    name: 'readOnlyMode',
    flags: ['--read-only', '-ro'],
    description: 'Enable read-only mode',
    required: false,
    defaultValue: false,
  },
  {
    name: 'mode',
    flags: ['--mode', '-m'],
    description:
      'Set the mode for tool selection: "api" - API tools only, "apps" - (Beta) Monday Apps tools only, "atp" - ATP server mode with GraphQL exploration',
    required: false,
    defaultValue: 'api',
  },
  {
    name: 'enableDynamicApiTools',
    flags: ['--enable-dynamic-api-tools', '-edat'],
    description:
      '(Beta) Enable dynamic API tools. Options: "true" (enables along with other tools), "only" (only dynamic API tools), "false" (disabled). Not supported when using read-only mode.',
    required: false,
    defaultValue: false,
  },
];

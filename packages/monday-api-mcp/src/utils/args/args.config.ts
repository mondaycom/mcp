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
    name: 'enableDynamicApiTools',
    flags: ['--enable-dynamic-api-tools', '-edat'],
    description:
      '(Beta) Enable dynamic API tools (Mode that includes the whole API schema, not supported when using read-only mode)',
    required: false,
    defaultValue: false,
  },
  {
    name: 'enableMondayAppsTools',
    flags: ['--enable-monday-apps-tools', '-emat'],
    description: '(Beta) Enable Monday Apps tools',
    required: false,
    defaultValue: false,
  },
];

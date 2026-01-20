import { MondayAppsToolType } from './base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from './consts/apps.consts';
import { storageTools } from './storage';
import { appTools } from './app';
import { appVersionTools } from './app-version';
import { appFeatureTools } from './app-feature';
import { codeTools } from './monday-code';
import { appDevelopmentAssistantTools } from './app-development-assistant';

export const mondayAppsTools = {
  [MondayAppsToolCategory.STORAGE]: storageTools,
  [MondayAppsToolCategory.APP]: appTools,
  [MondayAppsToolCategory.APP_VERSION]: appVersionTools,
  [MondayAppsToolCategory.APP_FEATURE]: appFeatureTools,
  [MondayAppsToolCategory.MONDAY_CODE]: codeTools,
  [MondayAppsToolCategory.APP_DEVELOPMENT_ASSISTANT]: appDevelopmentAssistantTools,
};

export const allMondayAppsTools: MondayAppsToolType[] = [
  ...storageTools,
  ...appTools,
  ...appVersionTools,
  ...appFeatureTools,
  ...codeTools,
  ...appDevelopmentAssistantTools,
];

export * from './storage';
export * from './app';
export * from './app-version';
export * from './app-feature';
export * from './monday-code';
export * from './app-development-assistant';

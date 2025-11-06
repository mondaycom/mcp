import { MondayAppsToolType } from './base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from './consts/apps.consts';
import { storageTools } from './storage';
import { appTools } from './app';
import { appVersionTools } from './app-version';
import { appFeatureTools } from './app-feature';
import { codeTools } from './monday-code';

export const mondayAppsTools = {
  [MondayAppsToolCategory.STORAGE]: storageTools,
  [MondayAppsToolCategory.APP]: appTools,
  [MondayAppsToolCategory.APP_VERSION]: appVersionTools,
  [MondayAppsToolCategory.APP_FEATURE]: appFeatureTools,
  [MondayAppsToolCategory.MONDAY_CODE]: codeTools,
};

export const allMondayAppsTools: MondayAppsToolType[] = [
  ...storageTools,
  ...appTools,
  ...appVersionTools,
  ...appFeatureTools,
  ...codeTools,
];

export * from './storage';
export * from './app';
export * from './app-version';
export * from './app-feature';
export * from './monday-code';

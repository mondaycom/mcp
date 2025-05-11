import { allMondayAppsTools } from './monday-apps-tools';
import { allGraphqlApiTools } from './platform-api-tools';

export const allTools = [...allGraphqlApiTools, ...allMondayAppsTools];

export { allGraphqlApiTools, allMondayAppsTools };

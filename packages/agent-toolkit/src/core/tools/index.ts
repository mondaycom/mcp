import { allMondayAppsTools } from './monday-apps-tools';
import { allGraphqlApiTools } from './platform-api-tools';
import { allMondayDevTools } from './monday-dev-tools';

export const allTools = [...allGraphqlApiTools, ...allMondayDevTools, ...allMondayAppsTools];

export { allGraphqlApiTools, allMondayDevTools, allMondayAppsTools };

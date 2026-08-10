import { WORKFLOW_BUILDER_AGENT_PATH, WORKFLOW_PLANNER_AGENT_PATH } from '../ai-agent.utils';

const PUBLIC_BASE_URL = 'https://api.monday.com';

export const WORKFLOW_BUILDER_AGENT_URL = `${PUBLIC_BASE_URL}${WORKFLOW_BUILDER_AGENT_PATH}`;
export const WORKFLOW_PLANNER_AGENT_URL = `${PUBLIC_BASE_URL}${WORKFLOW_PLANNER_AGENT_PATH}`;

// Read limits mirror the workflow-builder subgraph (get_workflow / live_workflows_page).
export const MAX_WORKFLOWS_PER_QUERY = 50;
export const DEFAULT_LIVE_WORKFLOWS_PAGE_SIZE = 50;
export const MAX_LIVE_WORKFLOWS_PAGE_SIZE = 100;

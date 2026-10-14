import { MondayFetch } from '../../monday-agent-toolkit';
import { MondayApiToolContext } from './base-monday-api-tool';

export const PLATFORM_AGENT_SERVICE_NAME = 'platform-agent';
export const WORKFLOW_BUILDER_AGENT_PATH = '/platform-ai-gateway/agents/workflow-builder';
export const WORKFLOW_PLANNER_AGENT_PATH = '/platform-ai-gateway/agents/workflow-planner';
export const LITE_BUILDER_AGENT_PATH = '/platform-ai-gateway/agents/lite-builder';
const DEFAULT_PUBLIC_BASE_URL = 'https://api.monday.com';

const defaultMondayFetch: MondayFetch = ({ path, method, headers, body, signal }) =>
  fetch(`${DEFAULT_PUBLIC_BASE_URL}${path}`, { method, headers, body, signal });

export const resolveMondayFetch = (context: MondayApiToolContext | undefined): MondayFetch =>
  context?.fetchConfig?.fetch ?? defaultMondayFetch;

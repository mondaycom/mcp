import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import {
  AppDevelopmentContextResponse,
  AppDevelopmentContextType,
  getAppDevelopmentContextSchema,
} from './schemas/assistant-schemas';
import {
  APP_DEVELOPMENT_GUIDE_CONTENT,
  QUICK_START_SECTION,
  SDK_REFERENCE_CONTENT,
  DEPLOYMENT_CONTENT,
  BEST_PRACTICES_CONTENT,
  TROUBLESHOOTING_SECTION,
} from './docs/app-development-guide-content';

/**
 * Content lookup by context type - simple direct mapping
 */
const CONTENT_BY_TYPE: Record<AppDevelopmentContextType, string> = {
  [AppDevelopmentContextType.FULL]: APP_DEVELOPMENT_GUIDE_CONTENT,
  [AppDevelopmentContextType.QUICK_START]: QUICK_START_SECTION,
  [AppDevelopmentContextType.SDK_REFERENCE]: SDK_REFERENCE_CONTENT,
  [AppDevelopmentContextType.MONDAY_CODE_DEPLOYMENT]: DEPLOYMENT_CONTENT,
  [AppDevelopmentContextType.BEST_PRACTICES]: BEST_PRACTICES_CONTENT,
  [AppDevelopmentContextType.TROUBLESHOOTING]: TROUBLESHOOTING_SECTION,
};

/**
 * Quick CLI commands hint for deployment-related queries
 */
const DEPLOYMENT_HINT = `

💡 **Quick Commands:**
- Deploy backend to monday-code: \`mapps code:push\`
- Deploy frontend to CDN: \`mapps code:push -c\`
- **Connect to feature**: \`mapps app-features:build -a <app_id> -i <version_id> -f <feature_id> -d\`
- List features: \`mapps app-features:list -a <app_id> -i <version_id>\`
- Check status: \`mapps code:status --appVersionId <id>\`
- Set env var: \`mapps code:env:set --appId <id> --key KEY --value "value"\`
- View logs: \`mapps code:logs --appVersionId <id>\`

⚠️ **Important**: After \`code:push\`, always connect deployment to features with \`app-features:build\`!`;

export class GetAppDevelopmentContextTool extends BaseMondayAppsTool<
  typeof getAppDevelopmentContextSchema.shape,
  AppDevelopmentContextResponse
> {
  name = 'monday_apps_get_development_context';
  category = MondayAppsToolCategory.APP_DEVELOPMENT_ASSISTANT;
  type: ToolType = ToolType.READ;
  annotations = createMondayAppsAnnotations({
    title: 'Get App Development Context',
    readOnlyHint: true,
  });

  getDescription(): string {
    return `Get comprehensive documentation and context for building monday.com apps. This tool provides:
- Quick start guides for creating new apps
- OAuth scopes reference (boards:read, boards:write, users:read, etc.) with guidance on which scopes to use
- monday.com SDK reference and usage examples
- monday-code deployment instructions (including 'mapps code:push')
- Connecting deployments to app features (mapps app-features:build)
- Vibe Design System components and styling
- Best practices for performance, security, and error handling
- Troubleshooting common issues
- CLI commands reference

Use this tool when you need to:
- Help users build or modify monday.com apps
- Determine which OAuth scopes an app needs based on its functionality
- Guide users through deploying to monday-code
- Connect deployed code to app features
- Provide SDK usage examples and patterns
- Build UIs with Vibe components
- Create workflow automations with custom triggers/actions
- Implement custom objects and relationships
- Troubleshoot app development issues

The context includes code examples for:
- Board views, item views, dashboard widgets
- Custom columns and integrations
- Vibe components (Button, TextField, Dropdown, Modal, Toast, etc.)
- Workflow blocks with input/output field definitions
- Custom objects with schemas and CRUD operations
- API calls, storage, and webhooks
- OAuth scope configuration via manifest
- Deployment and connecting features to deployments`;
  }

  getInputSchema() {
    return getAppDevelopmentContextSchema.shape;
  }

  protected async executeInternal(
    input?: ToolInputType<typeof getAppDevelopmentContextSchema.shape>,
  ): Promise<ToolOutputType<AppDevelopmentContextResponse>> {
    const contextType = input?.contextType || AppDevelopmentContextType.FULL;
    const specificTopic = input?.specificTopic;

    // Get content directly from lookup map
    let content = CONTENT_BY_TYPE[contextType] || APP_DEVELOPMENT_GUIDE_CONTENT;

    // If a specific topic is requested, filter further
    if (specificTopic) {
      content = this.filterByTopic(content, specificTopic);
    }

    // Add CLI helper hint for deployment-related queries
    const shouldShowDeploymentHint =
      contextType === AppDevelopmentContextType.MONDAY_CODE_DEPLOYMENT ||
      specificTopic?.toLowerCase().includes('deploy') ||
      specificTopic?.toLowerCase().includes('push');

    const deploymentHint = shouldShowDeploymentHint ? DEPLOYMENT_HINT : '';

    return {
      content: content + deploymentHint,
      metadata: {
        statusCode: 200,
        contextType,
        content: content.substring(0, 500) + '...', // Truncated for metadata
      },
    };
  }

  /**
   * Filter content to focus on a specific topic
   */
  private filterByTopic(content: string, topic: string): string {
    const topicLower = topic.toLowerCase();
    const lines = content.split('\n');
    const relevantSections: string[] = [];
    let currentSection: string[] = [];
    let isRelevant = false;

    for (const line of lines) {
      // Check if this is a header
      const headerMatch = line.match(/^(#{1,4})\s+(.+)/);

      if (headerMatch) {
        // Save previous section if relevant
        if (isRelevant && currentSection.length > 0) {
          relevantSections.push(currentSection.join('\n'));
        }

        // Start new section
        currentSection = [line];
        isRelevant = headerMatch[2].toLowerCase().includes(topicLower);
      } else {
        currentSection.push(line);
        // Also check content for relevance
        if (line.toLowerCase().includes(topicLower)) {
          isRelevant = true;
        }
      }
    }

    // Don't forget the last section
    if (isRelevant && currentSection.length > 0) {
      relevantSections.push(currentSection.join('\n'));
    }

    if (relevantSections.length === 0) {
      return `No specific content found for topic "${topic}". Here's the general guide:\n\n${content}`;
    }

    return `# Content related to "${topic}"\n\n${relevantSections.join('\n\n---\n\n')}`;
  }
}

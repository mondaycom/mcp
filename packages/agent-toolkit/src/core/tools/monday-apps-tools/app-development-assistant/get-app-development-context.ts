import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import {
  AppDevelopmentContextResponse,
  AppDevelopmentContextType,
  getAppDevelopmentContextSchema,
} from './schemas/assistant-schemas';
import { APP_DEVELOPMENT_GUIDE_CONTENT } from './docs/app-development-guide-content';

/**
 * Section markers for filtering content by context type
 */
const SECTION_MARKERS: Record<AppDevelopmentContextType, { start: string; end?: string }[]> = {
  [AppDevelopmentContextType.FULL]: [], // Return everything
  [AppDevelopmentContextType.QUICK_START]: [{ start: '## Quick Start', end: '## monday.com SDK Reference' }],
  [AppDevelopmentContextType.SDK_REFERENCE]: [
    { start: '## monday.com SDK Reference', end: '## monday-code Deployment' },
  ],
  [AppDevelopmentContextType.MONDAY_CODE_DEPLOYMENT]: [{ start: '## monday-code Deployment', end: '## App Features' }],
  [AppDevelopmentContextType.BEST_PRACTICES]: [{ start: '## Best Practices', end: '## Troubleshooting' }],
  [AppDevelopmentContextType.TROUBLESHOOTING]: [
    { start: '## Troubleshooting', end: '## CLI Commands Reference' },
    { start: '## CLI Commands Reference', end: '## Useful Links' },
  ],
};

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
- Workflow Blocks (custom triggers and actions for automations)
- Custom Objects (app-defined data entities)
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

    let content = this.getContentByType(contextType);

    // If a specific topic is requested, try to filter further
    if (specificTopic) {
      content = this.filterByTopic(content, specificTopic);
    }

    // Add CLI helper hint for deployment-related queries
    const deploymentHint =
      contextType === AppDevelopmentContextType.MONDAY_CODE_DEPLOYMENT ||
      specificTopic?.toLowerCase().includes('deploy') ||
      specificTopic?.toLowerCase().includes('push')
        ? `\n\n💡 **Quick Commands:**
- Deploy backend to monday-code: \`mapps code:push\`
- Deploy frontend to CDN: \`mapps code:push -c\`
- **Connect to feature**: \`mapps app-features:build -a <app_id> -i <version_id> -f <feature_id> -d\`
- List features: \`mapps app-features:list -a <app_id> -i <version_id>\`
- Check status: \`mapps code:status --appVersionId <id>\`
- Set env var: \`mapps code:env:set --appId <id> --key KEY --value "value"\`
- View logs: \`mapps code:logs --appVersionId <id>\`

⚠️ **Important**: After \`code:push\`, always connect deployment to features with \`app-features:build\`!`
        : '';

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
   * Extract content sections based on the context type
   */
  private getContentByType(contextType: AppDevelopmentContextType): string {
    if (contextType === AppDevelopmentContextType.FULL) {
      return APP_DEVELOPMENT_GUIDE_CONTENT;
    }

    const markers = SECTION_MARKERS[contextType];
    if (!markers || markers.length === 0) {
      return APP_DEVELOPMENT_GUIDE_CONTENT;
    }

    let result = `# monday.com App Development - ${this.formatContextTypeName(contextType)}\n\n`;

    for (const marker of markers) {
      const section = this.extractSection(APP_DEVELOPMENT_GUIDE_CONTENT, marker.start, marker.end);
      if (section) {
        result += section + '\n\n';
      }
    }

    return result.trim();
  }

  /**
   * Extract a section from the content between start and end markers
   */
  private extractSection(content: string, start: string, end?: string): string | null {
    const startIndex = content.indexOf(start);
    if (startIndex === -1) return null;

    if (!end) {
      return content.substring(startIndex);
    }

    const endIndex = content.indexOf(end, startIndex);
    if (endIndex === -1) {
      return content.substring(startIndex);
    }

    return content.substring(startIndex, endIndex).trim();
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
    let sectionDepth = 0;

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
        sectionDepth = headerMatch[1].length;
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

  /**
   * Format context type for display
   */
  private formatContextTypeName(contextType: AppDevelopmentContextType): string {
    const names: Record<AppDevelopmentContextType, string> = {
      [AppDevelopmentContextType.FULL]: 'Complete Guide',
      [AppDevelopmentContextType.QUICK_START]: 'Quick Start',
      [AppDevelopmentContextType.SDK_REFERENCE]: 'SDK Reference',
      [AppDevelopmentContextType.MONDAY_CODE_DEPLOYMENT]: 'monday-code Deployment',
      [AppDevelopmentContextType.BEST_PRACTICES]: 'Best Practices',
      [AppDevelopmentContextType.TROUBLESHOOTING]: 'Troubleshooting',
    };
    return names[contextType] || contextType;
  }
}

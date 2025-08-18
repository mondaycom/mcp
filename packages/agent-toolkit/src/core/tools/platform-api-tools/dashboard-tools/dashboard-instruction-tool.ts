import { ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

export class DashboardWorkflowTool extends BaseMondayApiTool<Record<string, never>> {
  name = 'dashboard_instructions';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Dashboard Creation Instructions',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `When the user asks to create a dashboard, you must use this tool first to get the instructions on how to create a dashboard.
    Provides comprehensive step-by-step instructions for creating dashboards and widgets in monday.com.
    Use this tool when the user requests:
    - Dashboard creation (e.g., "create a dashboard", "build a dashboard")
    - Widget creation (e.g., "add widgets", "create chart widgets")
    - Dashboard workflow guidance (e.g., "how to create dashboards", "dashboard setup process")
    `;
  }

  getInputSchema(): Record<string, never> {
    return {};
  }

  protected async executeInternal(): Promise<ToolOutputType<never>> {
    const instructions = `
# Complete Dashboard Creation Workflow

## Overview
This guide provides step-by-step instructions for creating comprehensive dashboards with widgets in monday.com. Dashboards aggregate data from boards and provide visual insights through various widget types.

## Workflow Steps

### Step 1: Understand Board Structure and Data (\`get_board_info\`, \`get_board_items\`, \`get_board_activity\`, \`get_board_schema\`)
**CRITICAL FIRST STEP - Deep Understanding Required**

Before creating any dashboard, you must thoroughly understand the source data:

#### 1.1 Fetch Board Metadata
Use the get_board_info tool to fetch the board metadata.

#### 1.2 Analyze Column Types for Widget Planning
**Understanding column types and board id to column id mapping is essential for widget creation:**
i.e
- **Status Columns** → Perfect for CHART widgets (pie charts, bar charts)
- **Number Columns** → Ideal for NUMBER widgets (sums, averages, KPIs)

#### 1.3 Assess Data Volume and Patterns
- You can also take a sample of the board data from the \`get_board_items\` tool.
- Check \`items_count\` to understand data volume
- Identify grouping patterns for meaningful aggregations

### Step 2: Create the Dashboard Container (\`create_dashboard\`)
**Use the \`create_dashboard\` tool with proper configuration**

#### 2.1 Choose Dashboard Placement
\`\`\`typescript
// Example dashboard creation
{
  name: "Sales Performance Dashboard",
  workspace_id: 12345,
  board_ids: ["987654321", "987654322"],
  kind: "PRIVATE", // or "PUBLIC" for workspace-wide access
  board_folder_id: 56789 // Optional: place in specific folder
}
\`\`\`

#### 2.2 Dashboard Naming Best Practices
- **Descriptive**: "Q4 Sales Performance Dashboard"
- **Context-Aware**: "Project Management Overview - Development Team"
- **Purpose-Driven**: "Customer Success Metrics & KPIs"

### Step 3: Fetch and Understand Widget Schemas (\`all_widgets_schema\`)
**Use the \`all_widgets_schema\` tool to understand available widgets**

#### 3.1 Retrieve Complete Widget Schemas
The tool returns JSON Schema 7 definitions for all widget types:
i.e:
- **CHART Widgets**: Visual data representation
  - Pie charts, bar charts, line charts, column charts
  - Perfect for status distributions, category breakdowns
  
- **NUMBER Widgets**: Numeric metrics and KPIs
  - Sums, averages, counts, percentages
  - Ideal for totals, completion rates, performance metrics
  
- **BATTERY Widgets**: Progress and completion tracking
  - Progress bars, completion percentages, status indicators
  - Great for project progress, goal achievement, capacity utilization

#### 3.2 Schema Compliance Requirements
**CRITICAL**: Every widget MUST comply 100% with its JSON Schema:

1. **Required Fields**: All required properties must be provided
2. **Data Types**: Exact type matching (string, number, boolean, array)
3. **Enum Values**: Use only allowed enum values
4. **Constraints**: Respect min/max values, string lengths, array sizes
5. **Nested Objects**: Follow exact structure for complex settings

### Step 4: Plan Domain-Beneficial Widgets
**Strategic widget planning based on real data analysis**

### Step 5: Execute Widget Creation (\`create_widget\`)
**Use the \`create_widget\` tool with schema-compliant settings**

#### 5.1 Widget Creation Parameters
\`\`\`typescript
{
  parent_container_id: dashboard_id, // From Step 2
  parent_container_type: "DASHBOARD",
  widget_kind: "CHART", // CHART, NUMBER, or BATTERY
  widget_name: "Status Distribution Analysis",
  settings: {
    // Schema-compliant settings object
    // MUST match the JSON Schema exactly
  }
}
\`\`\`

#### 5.2 Error Handling and Validation
**Common validation errors and solutions:**

- **Schema Validation Failed**: Check all required fields are provided
- **Enum Value Error**: Use exact enum values from schema
- **Type Mismatch**: Ensure data types match schema requirements


## Critical Success Factors

### Data Quality Requirements
1. **Clean Data**: Ensure source boards have consistent, clean data
2. **Complete Information**: Verify all required columns exist
3. **Proper Formatting**: Check date formats, number formats, status values

### Schema Compliance Checklist
- [ ] All required fields provided
- [ ] Data types match exactly
- [ ] Enum values are valid
- [ ] Constraints respected (min/max, lengths)
- [ ] Nested objects structured correctly

### Performance Considerations
1. **Board Selection**: Choose boards with relevant, focused data
2. **Widget Count**: Balance comprehensiveness with load time
3. **Data Volume**: Consider impact of large datasets on widget performance


## Implementation Checklist

1. ✅ Understand board structure and columns
2. ✅ Analyze data patterns and volume
3. ✅ Create dashboard with proper configuration
4. ✅ Fetch and understand widget schemas
5. ✅ Plan widgets based on data analysis
6. ✅ Ensure 100% schema compliance
7. ✅ Create widgets with proper settings
8. ✅ Document dashboard purpose and usage

Remember: Success depends on understanding your data first, then creating widgets that provide genuine business value and insights.
`;

    return {
      content: instructions.trim(),
    };
  }
}

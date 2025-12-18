import { filterByTopic, filterByTopicWithDetails } from '../content-filter.utils';

describe('filterByTopic', () => {
  const sampleContent = `# Main Title

Introduction paragraph.

## Section About Deployment

This section talks about deployment.
Deploy your app using the CLI.

## Section About SDK

This section covers the SDK.
Initialize the monday SDK.

## Another Section

This has no relevant content.

### Nested Header

Some nested content here.

## Deployment Commands

More deployment info here.
`;

  it('filters content by topic found in header', () => {
    const result = filterByTopic(sampleContent, 'SDK');

    expect(result).toContain('Content related to "SDK"');
    expect(result).toContain('## Section About SDK');
    expect(result).toContain('Initialize the monday SDK');
    expect(result).not.toContain('## Section About Deployment');
  });

  it('filters content by topic found in body text', () => {
    const result = filterByTopic(sampleContent, 'deploy');

    expect(result).toContain('Content related to "deploy"');
    expect(result).toContain('## Section About Deployment');
    expect(result).toContain('## Deployment Commands');
  });

  it('is case insensitive', () => {
    const result = filterByTopic(sampleContent, 'DEPLOYMENT');

    expect(result).toContain('Content related to "DEPLOYMENT"');
    expect(result).toContain('## Section About Deployment');
  });

  it('returns original content when no matches found', () => {
    const result = filterByTopic(sampleContent, 'nonexistent');

    expect(result).toContain('No specific content found for topic "nonexistent"');
    expect(result).toContain(sampleContent);
  });

  it('separates multiple matching sections with dividers', () => {
    const result = filterByTopic(sampleContent, 'deploy');

    // Should have separator between sections
    expect(result).toContain('---');
  });

  it('includes section content up to next header', () => {
    const result = filterByTopic(sampleContent, 'SDK');

    expect(result).toContain('This section covers the SDK');
    expect(result).toContain('Initialize the monday SDK');
  });

  it('handles content with only headers', () => {
    const headerOnlyContent = `# Header One
## Header Two
### Header Three`;

    const result = filterByTopic(headerOnlyContent, 'Two');

    expect(result).toContain('## Header Two');
  });

  it('handles empty content', () => {
    const result = filterByTopic('', 'test');

    expect(result).toContain('No specific content found for topic "test"');
  });

  it('handles content without any headers', () => {
    const noHeaderContent = `This is just plain text.
It has no markdown headers.
But it mentions deployment here.`;

    const result = filterByTopic(noHeaderContent, 'deployment');

    // Should find content since the word is in the body
    expect(result).toContain('deployment');
  });

  it('matches partial words in headers', () => {
    const content = `## Authentication
How to authenticate.`;

    const result = filterByTopic(content, 'auth');

    expect(result).toContain('## Authentication');
  });

  it('handles special characters in topic', () => {
    const content = `## Node.js Setup
Install node.js here.`;

    const result = filterByTopic(content, 'node.js');

    expect(result).toContain('## Node.js Setup');
  });
});

describe('filterByTopicWithDetails', () => {
  const sampleContent = `## Section One
Content about widgets.

## Section Two
More widget info.

## Section Three
Unrelated content.`;

  it('returns section count along with content', () => {
    const result = filterByTopicWithDetails(sampleContent, 'widget');

    expect(result.sectionsFound).toBe(2);
    expect(result.content).toContain('## Section One');
    expect(result.content).toContain('## Section Two');
  });

  it('returns zero sections when no matches', () => {
    const result = filterByTopicWithDetails(sampleContent, 'nonexistent');

    expect(result.sectionsFound).toBe(0);
    expect(result.content).toContain('No specific content found');
  });

  it('returns one section when single match', () => {
    const result = filterByTopicWithDetails(sampleContent, 'Unrelated');

    expect(result.sectionsFound).toBe(1);
    expect(result.content).toContain('## Section Three');
  });
});

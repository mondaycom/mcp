/**
 * Content filtering utilities for markdown documentation
 */

export interface FilterByTopicResult {
  content: string;
  sectionsFound: number;
}

/**
 * Filters markdown content to extract sections relevant to a specific topic.
 * Searches both headers and content for the topic keyword.
 *
 * @param content - The full markdown content to filter
 * @param topic - The topic keyword to search for
 * @returns Filtered content with only relevant sections, or original content if no matches
 */
export function filterByTopic(content: string, topic: string): string {
  const topicLower = topic.toLowerCase();
  const lines = content.split('\n');
  const relevantSections: string[] = [];
  let currentSection: string[] = [];
  let isRelevant = false;

  for (const line of lines) {
    // Check if this is a markdown header (# to ####)
    const headerMatch = line.match(/^(#{1,4})\s+(.+)/);

    if (headerMatch) {
      // Save previous section if it was relevant
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

/**
 * Filters markdown content and returns detailed result including section count.
 *
 * @param content - The full markdown content to filter
 * @param topic - The topic keyword to search for
 * @returns Object with filtered content and number of sections found
 */
export function filterByTopicWithDetails(content: string, topic: string): FilterByTopicResult {
  const topicLower = topic.toLowerCase();
  const lines = content.split('\n');
  const relevantSections: string[] = [];
  let currentSection: string[] = [];
  let isRelevant = false;

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,4})\s+(.+)/);

    if (headerMatch) {
      if (isRelevant && currentSection.length > 0) {
        relevantSections.push(currentSection.join('\n'));
      }
      currentSection = [line];
      isRelevant = headerMatch[2].toLowerCase().includes(topicLower);
    } else {
      currentSection.push(line);
      if (line.toLowerCase().includes(topicLower)) {
        isRelevant = true;
      }
    }
  }

  if (isRelevant && currentSection.length > 0) {
    relevantSections.push(currentSection.join('\n'));
  }

  if (relevantSections.length === 0) {
    return {
      content: `No specific content found for topic "${topic}". Here's the general guide:\n\n${content}`,
      sectionsFound: 0,
    };
  }

  return {
    content: `# Content related to "${topic}"\n\n${relevantSections.join('\n\n---\n\n')}`,
    sectionsFound: relevantSections.length,
  };
}

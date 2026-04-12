import { z } from 'zod';
import { gql } from 'graphql-request';
import {
  GetLinkCandidateItemsQuery,
  GetLinkCandidateItemsQueryVariables,
  ItemsQuery,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { filterRulesSchema, filtersOperatorSchema } from '../get-board-items-page-tool/items-filter-schema';
import { getLinkCandidateItems } from './link-board-items-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

const FETCH_PAGE_SIZE = 200;
const MAX_PAGES = 10;

type CandidateItem = {
  id: string;
  name: string;
  columnValues: Record<string, string>;
  existingLinkedItemIds: string[];
};

type MatchResult = {
  sourceItemId: string;
  sourceItemName: string;
  targetItemId: string;
  targetItemName: string;
  matchReason: string;
  confidence?: 'high' | 'medium' | 'low'; // present for semantic matches
};

type UnmatchedItem = {
  id: string;
  name: string;
};

// Represents a single item as presented to the LLM for semantic matching.
// Contains only the columns specified by the caller — keeping the payload minimal.
type LlmItem = {
  id: string;
  columnValues: Record<string, string>; // columnId → text value
};

// The LLM is expected to return this structure for each source item.
type LlmMatchDecision = {
  sourceItemId: string;
  targetItemId: string | null; // null = no confident match found
  confidence: 'high' | 'medium' | 'low';
  reason: string;
};

const boardConfigSchema = (side: 'source' | 'target') =>
  z.object({
    boardId: z.number().describe(
      `The ID of the ${side} board. ` +
      (side === 'source'
        ? 'The board whose items will be linked (e.g. invoices, tasks, contacts).'
        : 'The board containing the items to link to (e.g. vendors, projects, accounts).'),
    ),
    linkColumnId: z
      .string()
      .optional()
      .describe(
        `The ID of the board-relation column on the ${side.toUpperCase()} board to populate. ` +
          `Use this when the relation column lives on the ${side} side. ` +
          `Exactly one of source.linkColumnId or target.linkColumnId must be provided — not both, not neither.` +
          (side === 'target'
            ? ' When multiple source items match the same target, their IDs are merged into this column rather than overwritten.'
            : ''),
      ),
    matchColumnIds: z
      .array(z.string())
      .optional()
      .describe(
        `Column IDs on the ${side} board used for matching. ` +
          `In "exact" mode: omit or use [] on both boards to compare item names; or provide exactly one id per side to compare those two column values (case-insensitive). At most one id per side in exact mode. ` +
          `In "semantic" mode: provide one or more ids per side (both sides non-empty); the LLM uses all of them together — e.g. ["category", "owner", "description"].`,
      ),
    filters: filterRulesSchema.describe(
      `Optional filters to narrow which ${side} board items are fetched. ` +
        `Use get_board_info on the ${side} board to find column IDs and valid filter values. ` +
        (side === 'source'
          ? 'Example: only fetch items with status "Pending", or assigned to a specific person.'
          : 'Example: only fetch active records, or items belonging to a specific category.') +
        ' If omitted, all items are fetched. ' +
        `TIP: To skip items that are already linked, add a filter with operator "is_empty" on the linkColumnId — this filters server-side before transfer.`,
    ),
    filtersOperator: filtersOperatorSchema,
  });

export const linkBoardItemsToolSchema = {
  source: boardConfigSchema('source').describe(
    'Configuration for the source board — the board whose items will be linked to the target.',
  ),
  target: boardConfigSchema('target').describe(
    'Configuration for the target board — the board containing the items to link to.',
  ),
  matchMode: z
    .enum(['exact', 'semantic'])
    .default('exact')
    .describe(
      `How to match source items to target items:
- "exact": case-insensitive equality on one column per side via matchColumnIds (single id each), or item names if matchColumnIds omitted/empty on both sides. Use when data is clean and normalized.
- "semantic": LLM-powered matching across matchColumnIds (one or more per side). Requires non-empty source.matchColumnIds and target.matchColumnIds.`,
    ),
  semanticHint: z
    .string()
    .optional()
    .describe(
      'Optional natural language description of the relationship to help the LLM make better decisions. ' +
        'Example: "Match invoices to vendors by company name. Invoice rows use short names or abbreviations while vendor records use full legal names." ' +
        'Only used when matchMode is "semantic".',
    ),
  dryRun: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'When true, compute and return the proposed matches without writing anything. ' +
        'Always start with dryRun=true to inspect match quality before committing.',
    ),
};

export type LinkBoardItemsToolInput = typeof linkBoardItemsToolSchema;

export class LinkBoardItemsTool extends BaseMondayApiTool<LinkBoardItemsToolInput> {
  name = 'link_board_items';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Link Board Items',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      'Automatically links items across two monday.com boards by matching them using exact or semantic (LLM-powered) matching. ' +
      'Useful for connecting any cross-board relationship — invoices to vendors, contacts to accounts, orders to customers, and so on. ' +
      'Handles the full flow: fetches items from both boards, computes matches internally, then batch-writes the link column values. ' +
      'The board-relation column can live on either the source board (source.linkColumnId) or the target board (target.linkColumnId) — exactly one must be provided. ' +
      'When the link column is on the target side, multiple source matches for the same target item are merged rather than overwritten. ' +
      '\n\nMATCH MODES:\n' +
      '- exact: one column id per side in matchColumnIds, or empty on both sides for item names — fast when data is normalized.\n' +
      '- semantic: LLM reasons across multiple columns — handles typos, abbreviations, synonyms, and meaning-based relationships.\n\n' +
      'ERROR BEHAVIOR:\n' +
      '- If a source item matches more than one target, an error is raised listing all conflicting matches — the tool will not guess.\n' +
      '- If the board has more items than can be fetched (10 pages × 200 items), an error is raised. Use filters to narrow the dataset.\n\n' +
      'RECOMMENDED WORKFLOW:\n' +
      '1. Call with dryRun=true to inspect proposed matches and the unmatched list.\n' +
      '2. For unmatched items, consider switching matchMode or adjusting which columns are passed.\n' +
      '3. Repeat until match quality is acceptable, then call with dryRun=false to commit.\n\n' +
      'PRECONDITION: Use get_board_info on both boards first to identify the board-relation column ID and relevant match columns.'
    );
  }

  getInputSchema(): LinkBoardItemsToolInput {
    return linkBoardItemsToolSchema;
  }

  protected async executeInternal(input: ToolInputType<LinkBoardItemsToolInput>): Promise<ToolOutputType<never>> {
    this.validateInput(input);

    const linkSide = input.source.linkColumnId ? 'source' : 'target';
    const linkColumnId = (input.source.linkColumnId ?? input.target.linkColumnId)!;

    const sourceColumnIds = this.buildColumnIds('source', linkSide, linkColumnId, input.source, input.matchMode);
    const targetColumnIds = this.buildColumnIds('target', linkSide, linkColumnId, input.target, input.matchMode);

    let sourceItems: CandidateItem[];
    let targetItems: CandidateItem[];

    if (input.matchMode === 'semantic') {
      // For semantic mode: source is fetched fully; target is fetched with LLM-assisted filtering
      // so we never hold more than FETCH_PAGE_SIZE relevant target candidates in memory.
      sourceItems = await this.fetchAllItems(input.source.boardId, sourceColumnIds, this.buildQueryParams(input.source));
      targetItems = await this.fetchTargetItemsSemantic(
        input.target.boardId,
        targetColumnIds,
        this.buildQueryParams(input.target),
        sourceItems,
        input,
      );
    } else {
      [sourceItems, targetItems] = await Promise.all([
        this.fetchAllItems(input.source.boardId, sourceColumnIds, this.buildQueryParams(input.source)),
        this.fetchAllItems(input.target.boardId, targetColumnIds, this.buildQueryParams(input.target)),
      ]);
    }

    const matches = await this.computeMatches(sourceItems, targetItems, input);
    const matchedSourceIds = new Set(matches.map((m) => m.sourceItemId));
    const unmatched: UnmatchedItem[] = sourceItems
      .filter((item) => !matchedSourceIds.has(item.id))
      .map((item) => ({ id: item.id, name: item.name }));

    if (input.dryRun) {
      return {
        content: {
          dryRun: true,
          linkSide,
          matchMode: input.matchMode,
          sourceBoardId: input.source.boardId,
          targetBoardId: input.target.boardId,
          totalSourceItems: sourceItems.length,
          matches,
          unmatched,
          summary: `Dry run: ${matches.length} items would be linked, ${unmatched.length} items could not be matched.`,
        },
      };
    }

    const writeResults =
      linkSide === 'source'
        ? await this.batchWriteSourceLinks(input.source.boardId, linkColumnId, matches)
        : await this.batchWriteTargetLinks(input.target.boardId, linkColumnId, matches, targetItems);

    return {
      content: {
        linkSide,
        matchMode: input.matchMode,
        sourceBoardId: input.source.boardId,
        targetBoardId: input.target.boardId,
        totalSourceItems: sourceItems.length,
        linked: writeResults.succeeded,
        failed: writeResults.failed,
        unmatched,
        summary: `Linked ${writeResults.succeeded.length} items. ${writeResults.failed.length} writes failed. ${unmatched.length} items could not be matched.`,
      },
    };
  }

  private validateInput(input: ToolInputType<LinkBoardItemsToolInput>): void {
    const hasSourceLink = !!input.source.linkColumnId;
    const hasTargetLink = !!input.target.linkColumnId;

    if (hasSourceLink === hasTargetLink) {
      throw new Error('Exactly one of source.linkColumnId or target.linkColumnId must be provided.');
    }

    if (input.matchMode === 'semantic') {
      if (!input.source.matchColumnIds?.length || !input.target.matchColumnIds?.length) {
        throw new Error('source.matchColumnIds and target.matchColumnIds are required when matchMode is "semantic".');
      }
    } else {
      const s = input.source.matchColumnIds ?? [];
      const t = input.target.matchColumnIds ?? [];
      if (s.length > 1 || t.length > 1) {
        throw new Error(
          'In exact mode, each side may have at most one entry in matchColumnIds, or omit for name matching. Use matchMode "semantic" for multiple columns.',
        );
      }
      if (s.length !== t.length) {
        throw new Error(
          'In exact mode, source.matchColumnIds and target.matchColumnIds must both be empty (item names) or both contain exactly one column id.',
        );
      }
    }
  }

  private buildColumnIds(
    side: 'source' | 'target',
    linkSide: 'source' | 'target',
    linkColumnId: string,
    boardInput: ToolInputType<LinkBoardItemsToolInput>['source'],
    matchMode: string,
  ): string[] {
    const ids: string[] = [];
    if (side === linkSide) ids.push(linkColumnId);
    if (matchMode === 'semantic') {
      ids.push(...(boardInput.matchColumnIds ?? []));
    } else {
      const first = (boardInput.matchColumnIds ?? [])[0];
      if (first) ids.push(first);
    }
    return [...new Set(ids)];
  }

  private buildQueryParams(boardInput: { filters?: Array<any>; filtersOperator?: any } | undefined): ItemsQuery | undefined {
    if (!boardInput?.filters?.length) return undefined;
    return {
      operator: boardInput.filtersOperator,
      rules: boardInput.filters.map((f) => ({
        column_id: f.columnId.toString(),
        compare_value: Array.isArray(f.compareValue) ? f.compareValue.map(String) : [String(f.compareValue)],
        operator: f.operator,
        compare_attribute: f.compareAttribute,
      })),
    };
  }

  /**
   * Fetches all items from a board, paginated up to MAX_PAGES.
   * Throws if the board has more items than can be fetched — the caller must narrow with filters.
   */
  private async fetchAllItems(boardId: number, columnIds: string[], queryParams?: ItemsQuery): Promise<CandidateItem[]> {
    const allItems: CandidateItem[] = [];
    let cursor: string | null = null;
    let pagesLoaded = 0;

    do {
      const variables: GetLinkCandidateItemsQueryVariables = {
        boardId: boardId.toString(),
        limit: FETCH_PAGE_SIZE,
        cursor: cursor ?? undefined,
        columnIds: columnIds.length > 0 ? columnIds : undefined,
        queryParams: cursor ? undefined : queryParams,
      };

      const res = await this.mondayApi.request<GetLinkCandidateItemsQuery>(getLinkCandidateItems, variables);
      const page = res.boards?.[0]?.items_page;
      if (!page) break;

      allItems.push(...this.parseItems(page.items));
      cursor = page.cursor ?? null;
      pagesLoaded++;

      if (cursor && pagesLoaded >= MAX_PAGES) {
        throw new Error(
          `Board ${boardId} has more than ${MAX_PAGES * FETCH_PAGE_SIZE} items. ` +
            `Add filters to narrow the dataset before running this tool.`,
        );
      }
    } while (cursor);

    return allItems;
  }

  /**
   * Semantic-mode target fetch: pages through the target board, asking the LLM after each page
   * to filter down to only the candidates relevant to the source items. Accumulates relevant
   * candidates across pages — never holding the full board in memory.
   * Throws if the board has more pages than MAX_PAGES.
   */
  private async fetchTargetItemsSemantic(
    boardId: number,
    columnIds: string[],
    queryParams: ItemsQuery | undefined,
    sourceItems: CandidateItem[],
    input: ToolInputType<LinkBoardItemsToolInput>,
  ): Promise<CandidateItem[]> {
    const relevantItems: CandidateItem[] = [];
    let cursor: string | null = null;
    let pagesLoaded = 0;

    const llmSourceItems = this.toLlmItems(sourceItems, input.source.matchColumnIds ?? []);

    do {
      const variables: GetLinkCandidateItemsQueryVariables = {
        boardId: boardId.toString(),
        limit: FETCH_PAGE_SIZE,
        cursor: cursor ?? undefined,
        columnIds: columnIds.length > 0 ? columnIds : undefined,
        queryParams: cursor ? undefined : queryParams,
      };

      const res = await this.mondayApi.request<GetLinkCandidateItemsQuery>(getLinkCandidateItems, variables);
      const page = res.boards?.[0]?.items_page;
      if (!page) break;

      const pageItems = this.parseItems(page.items);
      cursor = page.cursor ?? null;
      pagesLoaded++;

      // Ask the LLM which items on this page are plausible matches for any source item.
      // Only those are retained — the rest are discarded before loading the next page.
      const llmPageItems = this.toLlmItems(pageItems, input.target.matchColumnIds ?? []);
      const relevantIds = await this.callLlmToFilterCandidates(llmSourceItems, llmPageItems, input.semanticHint);
      const relevantIdSet = new Set(relevantIds);
      relevantItems.push(...pageItems.filter((item) => relevantIdSet.has(item.id)));

      if (cursor && pagesLoaded >= MAX_PAGES) {
        throw new Error(
          `Board ${boardId} has more than ${MAX_PAGES * FETCH_PAGE_SIZE} items. ` +
            `Add filters to narrow the dataset before running this tool.`,
        );
      }
    } while (cursor);

    return relevantItems;
  }

  private parseItems(rawItems: NonNullable<NonNullable<NonNullable<GetLinkCandidateItemsQuery['boards']>[number]>['items_page']>['items'] | null | undefined): CandidateItem[] {
    const result: CandidateItem[] = [];
    for (const item of rawItems ?? []) {
      if (!item) continue;
      const columnValues: Record<string, string> = {};
      const existingLinkedItemIds: string[] = [];
      for (const cv of item.column_values ?? []) {
        if (!cv) continue;
        if ('linked_item_ids' in cv && Array.isArray(cv.linked_item_ids)) {
          existingLinkedItemIds.push(...cv.linked_item_ids);
        }
        columnValues[cv.id] = cv.text ?? '';
      }
      result.push({ id: item.id, name: item.name, columnValues, existingLinkedItemIds });
    }
    return result;
  }

  private toLlmItems(items: CandidateItem[], matchColumnIds: string[]): LlmItem[] {
    return items.map((item) => ({
      id: item.id,
      columnValues: {
        name: item.name,
        ...Object.fromEntries(matchColumnIds.map((col) => [col, item.columnValues[col] ?? ''])),
      },
    }));
  }

  private async computeMatches(
    sourceItems: CandidateItem[],
    targetItems: CandidateItem[],
    input: ToolInputType<LinkBoardItemsToolInput>,
  ): Promise<MatchResult[]> {
    if (input.matchMode === 'semantic') {
      return this.matchSemantic(sourceItems, targetItems, input);
    }

    const matches: MatchResult[] = [];
    const errors: string[] = [];

    const sourceCol = input.source.matchColumnIds?.[0];
    const targetCol = input.target.matchColumnIds?.[0];

    for (const source of sourceItems) {
      const sourceValue = sourceCol
        ? (source.columnValues[sourceCol] ?? '').toLowerCase().trim()
        : source.name.toLowerCase().trim();

      if (!sourceValue) continue;

      const matchingTargets = targetItems.filter((target) => {
        const targetValue = targetCol
          ? (target.columnValues[targetCol] ?? '').toLowerCase().trim()
          : target.name.toLowerCase().trim();
        return targetValue && sourceValue === targetValue;
      });

      if (matchingTargets.length > 1) {
        errors.push(
          `Source item "${source.name}" (id: ${source.id}) matched ${matchingTargets.length} target items: ` +
            matchingTargets.map((t) => `"${t.name}" (id: ${t.id})`).join(', ') +
            `. Refine filters or use a more specific match column to resolve the ambiguity.`,
        );
        continue;
      }

      if (matchingTargets.length === 1) {
        const target = matchingTargets[0];
        matches.push({
          sourceItemId: source.id,
          sourceItemName: source.name,
          targetItemId: target.id,
          targetItemName: target.name,
          matchReason: `Exact match: "${sourceValue}"`,
        });
      }
    }

    if (errors.length > 0) {
      throw new Error(`Ambiguous matches found — no items were linked:\n${errors.join('\n')}`);
    }

    return matches;
  }

  /**
   * Semantic matching via LLM.
   *
   * Input to LLM:
   *   - sourceItems: Array of { id, columnValues } — column values keyed by columnId,
   *     using only the columns listed in source.matchColumnIds.
   *   - targetItems: Array of { id, columnValues } — same structure for target.matchColumnIds.
   *     These are already pre-filtered by fetchTargetItemsSemantic to only plausible candidates.
   *   - semanticHint: optional caller-provided description of the relationship.
   *
   * Expected LLM response:
   *   Array of LlmMatchDecision:
   *   - sourceItemId: the source item being matched
   *   - targetItemId: the best matching target item ID, or null if no confident match
   *   - confidence: "high" | "medium" | "low"
   *   - reason: short explanation of why this match was chosen
   *
   * The LLM should:
   *   - Consider all provided columns together, not just names
   *   - Return null rather than guess when no match is confident
   *   - Match each source to at most one target
   *
   * NOT YET IMPLEMENTED — requires LLM client injection into BaseMondayApiTool.
   */
  private async matchSemantic(
    sourceItems: CandidateItem[],
    targetItems: CandidateItem[],
    input: ToolInputType<LinkBoardItemsToolInput>,
  ): Promise<MatchResult[]> {
    const llmSourceItems = this.toLlmItems(sourceItems, input.source.matchColumnIds ?? []);
    const llmTargetItems = this.toLlmItems(targetItems, input.target.matchColumnIds ?? []);

    const decisions: LlmMatchDecision[] = await this.callLlmForSemanticMatching(
      llmSourceItems,
      llmTargetItems,
      input.semanticHint,
    );

    const targetById = new Map(targetItems.map((t) => [t.id, t]));
    const sourceById = new Map(sourceItems.map((s) => [s.id, s]));

    return decisions
      .filter((d) => d.targetItemId !== null)
      .map((d) => {
        const source = sourceById.get(d.sourceItemId)!;
        const target = targetById.get(d.targetItemId!)!;
        return {
          sourceItemId: source.id,
          sourceItemName: source.name,
          targetItemId: target.id,
          targetItemName: target.name,
          matchReason: d.reason,
          confidence: d.confidence,
        };
      });
  }

  /**
   * NOT YET IMPLEMENTED.
   * Calls the LLM to determine semantic matches between source and target items.
   *
   * @param _sourceItems - Source items with their relevant column values
   * @param _targetItems - Target items with their relevant column values (pre-filtered)
   * @param _hint - Optional caller-provided hint about the relationship
   * @returns Array of match decisions, one per source item
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async callLlmForSemanticMatching(
    _sourceItems: LlmItem[],
    _targetItems: LlmItem[],
    _hint: string | undefined,
  ): Promise<LlmMatchDecision[]> {
    throw new Error('Semantic matching is not yet implemented.');
  }

  /**
   * NOT YET IMPLEMENTED.
   * Asks the LLM to filter a page of target candidates down to only those
   * that could plausibly match any of the source items. Used to limit memory
   * usage during target board pagination in semantic mode.
   *
   * @param _sourceItems - All source items with their relevant column values
   * @param _targetPageItems - One page of target items to filter
   * @param _hint - Optional caller-provided hint about the relationship
   * @returns IDs of target items that are plausible match candidates
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async callLlmToFilterCandidates(
    _sourceItems: LlmItem[],
    _targetPageItems: LlmItem[],
    _hint: string | undefined,
  ): Promise<string[]> {
    throw new Error('Semantic matching is not yet implemented.');
  }

  /**
   * Link column is on the source board — each source item gets its own write.
   */
  private async batchWriteSourceLinks(
    sourceBoardId: number,
    linkColumnId: string,
    matches: MatchResult[],
  ): Promise<{ succeeded: MatchResult[]; failed: Array<MatchResult & { error: string }> }> {
    if (matches.length === 0) return { succeeded: [], failed: [] };

    const aliases = matches.map((m, i) => {
      const colVal = JSON.stringify(JSON.stringify({ [linkColumnId]: { item_ids: [m.targetItemId] } }));
      return `item_${i}: change_multiple_column_values(board_id: "${sourceBoardId}", item_id: "${m.sourceItemId}", column_values: ${colVal}) { id }`;
    });

    return this.runBatchMutation(aliases, matches);
  }

  /**
   * Link column is on the target board — group source matches by target, merge with existing IDs, one write per target.
   */
  private async batchWriteTargetLinks(
    targetBoardId: number,
    linkColumnId: string,
    matches: MatchResult[],
    targetItems: CandidateItem[],
  ): Promise<{ succeeded: MatchResult[]; failed: Array<MatchResult & { error: string }> }> {
    if (matches.length === 0) return { succeeded: [], failed: [] };

    const existingByTargetId = new Map(targetItems.map((t) => [t.id, t.existingLinkedItemIds]));

    const newIdsByTarget = new Map<string, Set<string>>();
    for (const m of matches) {
      if (!newIdsByTarget.has(m.targetItemId)) newIdsByTarget.set(m.targetItemId, new Set());
      newIdsByTarget.get(m.targetItemId)!.add(m.sourceItemId);
    }

    const targetIdList = [...newIdsByTarget.keys()];
    const aliases = targetIdList.map((targetId, i) => {
      const existing = existingByTargetId.get(targetId) ?? [];
      const merged = [...new Set([...existing, ...newIdsByTarget.get(targetId)!])];
      const colVal = JSON.stringify(JSON.stringify({ [linkColumnId]: { item_ids: merged } }));
      return `item_${i}: change_multiple_column_values(board_id: "${targetBoardId}", item_id: "${targetId}", column_values: ${colVal}) { id }`;
    });

    const matchesByTarget = new Map<string, MatchResult[]>();
    for (const m of matches) {
      if (!matchesByTarget.has(m.targetItemId)) matchesByTarget.set(m.targetItemId, []);
      matchesByTarget.get(m.targetItemId)!.push(m);
    }

    return this.runBatchMutation(aliases, matches, matchesByTarget, targetIdList);
  }

  private async runBatchMutation(
    aliases: string[],
    matches: MatchResult[],
    matchesByTarget?: Map<string, MatchResult[]>,
    targetIdList?: string[],
  ): Promise<{ succeeded: MatchResult[]; failed: Array<MatchResult & { error: string }> }> {
    const batchMutation = gql`
      mutation BatchLinkItems {
        ${aliases.join('\n        ')}
      }
    `;

    try {
      await this.mondayApi.request(batchMutation);
      return { succeeded: matches, failed: [] };
    } catch {
      return this.sequentialWriteLinks(aliases, matches, matchesByTarget, targetIdList);
    }
  }

  private async sequentialWriteLinks(
    aliases: string[],
    matches: MatchResult[],
    matchesByTarget?: Map<string, MatchResult[]>,
    targetIdList?: string[],
  ): Promise<{ succeeded: MatchResult[]; failed: Array<MatchResult & { error: string }> }> {
    const succeeded: MatchResult[] = [];
    const failed: Array<MatchResult & { error: string }> = [];

    for (let i = 0; i < aliases.length; i++) {
      const mutation = gql`mutation LinkSingleItem { ${aliases[i]} }`;
      const relatedMatches = matchesByTarget && targetIdList
        ? (matchesByTarget.get(targetIdList[i]) ?? [])
        : [matches[i]];

      try {
        await this.mondayApi.request(mutation);
        succeeded.push(...relatedMatches);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        failed.push(...relatedMatches.map((m) => ({ ...m, error })));
      }
    }

    return { succeeded, failed };
  }
}

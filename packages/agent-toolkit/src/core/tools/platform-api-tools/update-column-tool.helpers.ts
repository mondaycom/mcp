import { GraphQLErrorResponse } from '../../../utils/graphql-error.types';

export const STATUS_LABEL_DESCRIPTION_MAX_LENGTH = 80;

export type ColumnSettings = Record<string, unknown>;

type DropdownLabel = {
  id?: number;
  name?: string;
  label?: string;
  is_deactivated?: boolean;
};

type StatusLabel = {
  id?: number;
  label?: string;
  color?: string | number;
  index?: number;
  description?: string;
  is_done?: boolean;
  is_deactivated?: boolean;
};

export function parseColumnSettings(columnSettings: unknown): ColumnSettings | undefined {
  if (columnSettings === undefined || columnSettings === null) {
    return undefined;
  }

  if (typeof columnSettings === 'string') {
    try {
      const parsed = JSON.parse(columnSettings);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('columnSettings must be a JSON object');
      }
      return parsed as ColumnSettings;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON';
      throw new Error(`Invalid columnSettings JSON: ${message}`);
    }
  }

  if (typeof columnSettings === 'object' && !Array.isArray(columnSettings)) {
    return columnSettings as ColumnSettings;
  }

  throw new Error('columnSettings must be a JSON object');
}

export function truncateStatusLabelDescriptions(settings: ColumnSettings): {
  settings: ColumnSettings;
  truncatedDescriptions: string[];
} {
  const labels = settings.labels;
  if (!Array.isArray(labels)) {
    return { settings, truncatedDescriptions: [] };
  }

  const truncatedDescriptions: string[] = [];
  const normalizedLabels = (labels as StatusLabel[]).map((label) => {
    if (typeof label.description !== 'string') {
      return label;
    }

    if (label.description.length <= STATUS_LABEL_DESCRIPTION_MAX_LENGTH) {
      return label;
    }

    truncatedDescriptions.push(label.label ?? `index:${label.index ?? 'unknown'}`);
    return {
      ...label,
      description: label.description.slice(0, STATUS_LABEL_DESCRIPTION_MAX_LENGTH),
    };
  });

  return {
    settings: { ...settings, labels: normalizedLabels },
    truncatedDescriptions,
  };
}

const STATUS_COLOR_VAR_NAME_MAP: Record<string, string> = {
  // Common monday.com status label UI var_name -> StatusColumnColors enum values
  orange: 'working_orange',
  'green-shadow': 'done_green',
  'red-shadow': 'stuck_red',
  'blue-links': 'dark_blue',
  purple: 'purple',
  grey: 'explosive',
  'grass-green': 'grass_green',
  'bright-blue': 'bright_blue',
  musterred: 'saladish',
  yellow: 'egg_yolk',
  'soft-black': 'blackish',
  pecan: 'pecan',
  'dark-pink': 'sofia_pink',
  'light-pink': 'lipstick',
  sunset: 'sunset',
  'orange-hot': 'dark_orange',
  'dark-red': 'dark_red',
};

function mapStatusColorVarNameToEnum(varName: unknown): string | undefined {
  if (typeof varName !== 'string' || varName.length === 0) {
    return undefined;
  }

  return STATUS_COLOR_VAR_NAME_MAP[varName] ?? varName;
}

function normalizeStatusColumnSettings(settings: ColumnSettings): ColumnSettings {
  // API expects UpdateStatusColumnSettingsInput => { labels: [ ... ] }.
  // The tool sometimes receives a richer "UI state" object with extra keys or
  // labels as an object map. We coerce it into the API shape and remove label ids
  // to avoid "new labels shouldn't include id" failures.
  const labels = settings.labels;

  // Already in API shape: coerce each label and remove id (best-effort).
  if (Array.isArray(labels)) {
    const normalized = (labels as StatusLabel[]).map((label) => {
      const {
        id: _ignoredId,
        label: labelText,
        color,
        index,
        description,
        is_done,
        is_deactivated,
      } = label;

      return {
        label: labelText,
        color,
        index,
        ...(typeof description === 'string' ? { description } : {}),
        ...(typeof is_done === 'boolean' ? { is_done } : {}),
        ...(typeof is_deactivated === 'boolean' ? { is_deactivated } : {}),
      };
    });

    return { labels: normalized };
  }

  // UI object shape: { labels: {<id>: <text>}, labels_positions_v2, labels_colors, done_colors, ... }
  if (labels && typeof labels === 'object') {
    const labelsObj = labels as Record<string, unknown>;
    const positions = settings.labels_positions_v2 as Record<string, unknown> | undefined;
    const colors = settings.labels_colors as Record<string, any> | undefined;
    const doneColors = settings.done_colors as unknown;

    const doneSet = new Set<string>();
    if (Array.isArray(doneColors)) {
      for (const v of doneColors) {
        if (typeof v === 'number' || typeof v === 'string') {
          doneSet.add(String(v));
        }
      }
    }

    const keys = Object.keys(labelsObj);
    const normalized = keys
      .map((key) => {
        const indexValue = positions?.[key];
        const index =
          typeof indexValue === 'number'
            ? indexValue
            : typeof indexValue === 'string'
              ? Number(indexValue)
              : undefined;

        const varName = colors?.[key]?.var_name ?? colors?.[key]?.varName;
        const color = mapStatusColorVarNameToEnum(varName);
        const labelText = labelsObj[key] as unknown;

        if (typeof labelText !== 'string') {
          return undefined;
        }

        return {
          label: labelText,
          color,
          index,
          ...(doneSet.has(key) ? { is_done: true } : {}),
        };
      })
      .filter(
        (x): x is { label: string; color: string | undefined; index: number | undefined; is_done?: boolean } => x !== undefined,
      )
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    return { labels: normalized };
  }

  return settings;
}

function normalizeDropdownLabel(label: DropdownLabel): DropdownLabel {
  const name = label.name ?? label.label;
  const normalized: DropdownLabel = {
    ...(label.id !== undefined ? { id: label.id } : {}),
    ...(name !== undefined ? { name } : {}),
    ...(label.is_deactivated !== undefined ? { is_deactivated: label.is_deactivated } : {}),
  };

  return normalized;
}

function buildDropdownCreateActions(newLabels: DropdownLabel[]) {
  return newLabels.map((label) => ({
    type: 'CREATE',
    label: {
      name: label.name ?? label.label ?? '',
    },
  }));
}

export function normalizeDropdownColumnSettings(settings: ColumnSettings): ColumnSettings {
  if (!Array.isArray(settings.labels)) {
    return settings;
  }

  const labels = (settings.labels as DropdownLabel[]).map(normalizeDropdownLabel);
  const newLabels = labels.filter((label) => label.id === undefined && (label.name ?? label.label));

  if (newLabels.length === 0) {
    return { ...settings, labels };
  }

  const existingLabels = labels.filter((label) => label.id !== undefined);

  if (existingLabels.length > 0) {
    const { labels: _labels, ...rest } = settings;
    return {
      ...rest,
      action: {
        type: 'MODIFY_LABELS',
        payload: buildDropdownCreateActions(newLabels),
      },
    };
  }

  return { ...settings, labels };
}

export function sanitizeColumnSettings(
  columnType: string,
  settings: ColumnSettings | undefined,
): { settings: ColumnSettings | undefined; warnings: string[] } {
  if (!settings) {
    return { settings, warnings: [] };
  }

  const warnings: string[] = [];
  let normalizedSettings = settings;

  if (columnType === 'status') {
    const coerced = normalizeStatusColumnSettings(settings);
    const { settings: statusSettings, truncatedDescriptions } = truncateStatusLabelDescriptions(coerced);
    normalizedSettings = statusSettings;
    if (truncatedDescriptions.length > 0) {
      warnings.push(
        `Truncated status label descriptions to ${STATUS_LABEL_DESCRIPTION_MAX_LENGTH} characters for: ${truncatedDescriptions.join(', ')}`,
      );
    }
  }

  if (columnType === 'dropdown') {
    normalizedSettings = normalizeDropdownColumnSettings(normalizedSettings);
    if (normalizedSettings.action) {
      warnings.push('Converted dropdown label additions to MODIFY_LABELS actions to avoid bulk label update failures.');
    }
  }

  return { settings: normalizedSettings, warnings };
}

export function getGraphQLErrorCode(error: unknown): string | undefined {
  const response = (error as GraphQLErrorResponse)?.response;
  return response?.errors?.[0]?.extensions?.code as string | undefined;
}

export function isRevisionMismatchError(error: unknown): boolean {
  return getGraphQLErrorCode(error) === 'REVISION_MISMATCH';
}

export async function fetchColumnRevision(
  request: (query: any, variables: { boardId: string }) => Promise<{ boards?: { columns?: { id?: string; revision?: string | null }[] | null }[] | null }>,
  getBoardSchemaQuery: any,
  boardId: string,
  columnId: string,
): Promise<string> {
  const result = await request(getBoardSchemaQuery, { boardId });
  const column = result.boards?.[0]?.columns?.find((entry) => entry?.id === columnId);

  if (!column?.revision) {
    throw new Error(`Could not fetch revision for column ${columnId} on board ${boardId}. Call get_board_schema first.`);
  }

  return column.revision;
}

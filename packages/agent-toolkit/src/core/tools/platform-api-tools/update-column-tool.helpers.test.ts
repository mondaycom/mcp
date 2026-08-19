import {
  normalizeDropdownColumnSettings,
  parseColumnSettings,
  sanitizeColumnSettings,
  truncateStatusLabelDescriptions,
} from './update-column-tool.helpers';

describe('update-column-tool.helpers', () => {
  describe('parseColumnSettings', () => {
    it('parses JSON strings', () => {
      expect(parseColumnSettings('{"labels":[]}')).toEqual({ labels: [] });
    });

    it('rejects invalid JSON', () => {
      expect(() => parseColumnSettings('{')).toThrow('Invalid columnSettings JSON');
    });
  });

  describe('truncateStatusLabelDescriptions', () => {
    it('truncates descriptions longer than 80 characters', () => {
      const longDescription = 'a'.repeat(120);
      const { settings, truncatedDescriptions } = truncateStatusLabelDescriptions({
        labels: [{ label: 'Verified', description: longDescription, color: 'grass_green', index: 0 }],
      });

      expect((settings.labels as { description: string }[])[0].description).toHaveLength(80);
      expect(truncatedDescriptions).toEqual(['Verified']);
    });
  });

  describe('normalizeDropdownColumnSettings', () => {
    it('converts new labels in a full list to MODIFY_LABELS actions', () => {
      const result = normalizeDropdownColumnSettings({
        labels: [
          { id: 1, label: 'Existing', is_deactivated: false },
          { label: 'TARA', is_deactivated: false },
        ],
      });

      expect(result.labels).toBeUndefined();
      expect(result.action).toEqual({
        type: 'MODIFY_LABELS',
        payload: [{ type: 'CREATE', label: { name: 'TARA' } }],
      });
    });

    it('normalizes label field to name', () => {
      const result = normalizeDropdownColumnSettings({
        labels: [{ id: 1, label: 'Existing', is_deactivated: false }],
      });

      expect(result.labels).toEqual([{ id: 1, name: 'Existing', is_deactivated: false }]);
    });
  });

  describe('sanitizeColumnSettings', () => {
    it('returns warnings for status and dropdown normalization', () => {
      const status = sanitizeColumnSettings('status', {
        labels: [{ label: 'Done', description: 'x'.repeat(100), color: 1, index: 0 }],
      });
      expect(status.warnings[0]).toContain('Truncated status label descriptions');

      const dropdown = sanitizeColumnSettings('dropdown', {
        labels: [{ id: 1, label: 'A', is_deactivated: false }, { label: 'B', is_deactivated: false }],
      });
      expect(dropdown.warnings[0]).toContain('MODIFY_LABELS actions');
    });

    it('coerces status label settings into API shape (labels array) and strips label ids', () => {
      const status = sanitizeColumnSettings('status', {
        labels: [
          { id: 15, label: 'A', description: 'x'.repeat(120), color: 'dark_orange', index: 1 },
        ],
        // Extra keys should be stripped for the API update_status_column_settings input.
        done_colors: [15],
      } as any);

      const labels = status.settings?.labels as any[];
      expect(Object.keys(status.settings ?? {})).toEqual(['labels']);
      expect(labels[0].id).toBeUndefined();
      expect(labels[0].description).toHaveLength(80);
      expect(status.warnings[0]).toContain('Truncated status label descriptions');
    });

    it('coerces status UI object shape into API labels array', () => {
      const status = sanitizeColumnSettings('status', {
        done_colors: [1],
        sumType: 'allStatuses',
        labels: {
          0: 'התקבלו חומרים',
          1: 'הופץ',
        },
        labels_positions_v2: {
          0: 2,
          1: 5,
        },
        labels_colors: {
          0: { var_name: 'orange' },
          1: { var_name: 'green-shadow' },
        },
      } as any);

      const labels = status.settings?.labels as any[];
      expect(Object.keys(status.settings ?? {})).toEqual(['labels']);
      expect(labels).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'התקבלו חומרים',
            index: 2,
            color: 'working_orange',
          }),
          expect.objectContaining({
            label: 'הופץ',
            index: 5,
            color: 'done_green',
            is_done: true,
          }),
        ]),
      );
    });
  });
});

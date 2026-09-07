import {
  buildFilterGuidelinesForColumnType,
  getFilterGuidelineForColumnType,
} from './column-filter-aggregation-guidelines';

describe('column-filter-aggregation-guidelines', () => {
  it('returns raw guideline text for documented column types', () => {
    expect(getFilterGuidelineForColumnType('text')).toContain('contains_text');
    expect(getFilterGuidelineForColumnType('people')).toContain('assigned_to_me');
  });

  it('returns undefined for types without documented filter rules', () => {
    expect(getFilterGuidelineForColumnType('unsupported_type_xyz')).toBeUndefined();
  });

  it('buildFilterGuidelinesForColumnType includes operators, type section, and subitems note', () => {
    const built = buildFilterGuidelinesForColumnType('status');
    expect(built).toContain('## [IMPORTANT] Operator Guidelines');
    expect(built).toContain('## [IMPORTANT] Column type: status');
    expect(built).toContain('contains_terms');
    expect(built).toContain('Sub Items Columns MUST NOT BE USED FOR FILTERING');
  });

  it('buildFilterGuidelinesForColumnType returns null when type has no docs', () => {
    expect(buildFilterGuidelinesForColumnType('unsupported_type_xyz')).toBeNull();
  });

  describe('virtual column ids', () => {
    it.each([
      ['last_updated', '__last_updated__'],
      ['creation_log', '__creation_log__'],
      ['item_id', '__item_id__'],
    ])('%s guidelines teach the underscored id %s in every correct example', (columnType, expectedId) => {
      const guideline = getFilterGuidelineForColumnType(columnType)!;
      expect(guideline).toContain(expectedId);

      const correctExamples = guideline.split('\n').filter((line) => line.includes('✅'));
      expect(correctExamples.length).toBeGreaterThan(0);
      for (const example of correctExamples) {
        expect(example).toContain(`"columnId": "${expectedId}"`);
      }
    });

    it('within_the_last and within_the_next document the [UNIT, AMOUNT] window', () => {
      const operatorSection = buildFilterGuidelinesForColumnType('date')!;

      expect(operatorSection).toContain('within_the_last');
      expect(operatorSection).toContain('within_the_next');
      expect(operatorSection).toContain('[UNIT, AMOUNT]');
      expect(operatorSection).toContain('"DAYS"');
      expect(operatorSection).toContain('"WORKDAYS"');
      expect(operatorSection).toContain('"WEEKS"');
      expect(operatorSection).toContain('"MONTHS"');
      expect(operatorSection).toMatch(/❌.*"compareValue": 7, "operator": "within_the_last"/);
    });

    it('group takes no surrounding underscores and flags __group__ as wrong', () => {
      const guideline = getFilterGuidelineForColumnType('group')!;

      const correctExamples = guideline.split('\n').filter((line) => line.includes('✅'));
      for (const example of correctExamples) {
        expect(example).toContain('"columnId": "group"');
      }

      expect(guideline).toMatch(/❌.*__group__/);
    });
  });
});

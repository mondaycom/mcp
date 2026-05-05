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
});

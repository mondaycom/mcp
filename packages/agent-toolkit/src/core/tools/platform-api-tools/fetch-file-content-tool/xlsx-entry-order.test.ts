import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { MAX_XLSX_ENTRIES, putWorkbookPartsFirst } from './xlsx-entry-order';

const WORKBOOK_PARTS = ['xl/_rels/workbook.xml.rels', 'xl/workbook.xml', 'xl/sharedStrings.xml', 'xl/styles.xml'];

async function entryNames(buffer: Buffer): Promise<string[]> {
  return Object.keys((await JSZip.loadAsync(buffer)).files);
}

async function zipOf(files: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content, { createFolders: false });
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

describe('putWorkbookPartsFirst', () => {
  it('moves the workbook parts to the front and keeps every entry', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Sheet1').addRow(['a', 'b']);
    const input = Buffer.from(await workbook.xlsx.writeBuffer());

    const output = await putWorkbookPartsFirst(input);

    const names = await entryNames(output);
    expect(names.slice(0, WORKBOOK_PARTS.length)).toEqual(WORKBOOK_PARTS);
    expect([...names].sort()).toEqual([...(await entryNames(input))].sort());
  });

  it('does not inflate entries that are already compressed', async () => {
    const input = await zipOf({ 'xl/workbook.xml': '<workbook/>', 'xl/worksheets/sheet1.xml': 'a'.repeat(50_000_000) });

    const started = Date.now();
    const output = await putWorkbookPartsFirst(input);
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(1_000);
    expect(Math.abs(output.length - input.length)).toBeLessThan(1_000);
  }, 30_000);

  it('adds an empty shared-strings part when the workbook has none, without folder entries', async () => {
    const input = await zipOf({ 'xl/workbook.xml': '<workbook/>', 'xl/worksheets/sheet1.xml': '<worksheet/>' });

    const names = await entryNames(await putWorkbookPartsFirst(input));

    expect(names).toEqual(['xl/workbook.xml', 'xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml']);
  });

  it(`refuses an archive with more than ${MAX_XLSX_ENTRIES} entries`, async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i <= MAX_XLSX_ENTRIES; i++) files[`part-${i}.xml`] = '';
    const input = await zipOf(files);

    await expect(putWorkbookPartsFirst(input)).rejects.toThrow('Workbook has too many parts to read');
  });

  it('returns a buffer it cannot read as a zip unchanged', async () => {
    const input = Buffer.from('definitely not an xlsx file');

    expect(await putWorkbookPartsFirst(input)).toBe(input);
  });
});

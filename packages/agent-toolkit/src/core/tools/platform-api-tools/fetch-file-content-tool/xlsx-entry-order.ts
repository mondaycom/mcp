import JSZip from 'jszip';

// ExcelJS's streaming reader reads the archive front to back. Excel and ExcelJS store the sheets before
// sharedStrings and workbook.xml, so the reader copies each sheet to a temp file it only deletes after a
// full read (exceljs#2147), and on Node 18+ it can lose entries (exceljs#3064). Moving these parts to the
// front avoids both.
const WORKBOOK_PARTS = ['xl/_rels/workbook.xml.rels', 'xl/workbook.xml', 'xl/sharedStrings.xml', 'xl/styles.xml'];
const SHARED_STRINGS = 'xl/sharedStrings.xml';
const EMPTY_SHARED_STRINGS =
  '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"/>';

// Real workbooks have tens of entries. JSZip rewrites archives with very many entries slowly
// (100,000 tiny entries take seconds), so such files are refused before rewriting.
export const MAX_XLSX_ENTRIES = 5_000;

export async function putWorkbookPartsFirst(xlsx: Buffer): Promise<Buffer> {
  // A zip JSZip cannot read (damaged central directory, deflate64, ...) goes to ExcelJS unchanged.
  const zip = await JSZip.loadAsync(xlsx).catch(() => undefined);
  if (!zip) return xlsx;

  const entryCount = Object.keys(zip.files).length;
  if (entryCount > MAX_XLSX_ENTRIES) {
    throw new Error(`Workbook has too many parts to read (${entryCount})`);
  }

  // Without a shared-strings part the reader waits for one until the end and copies every sheet to disk.
  if (!zip.files[SHARED_STRINGS]) zip.file(SHARED_STRINGS, EMPTY_SHARED_STRINGS, { createFolders: false });

  const names = Object.keys(zip.files);
  const ordered = [
    ...WORKBOOK_PARTS.filter((name) => name in zip.files),
    ...names.filter((name) => !WORKBOOK_PARTS.includes(name)),
  ];
  // JSZip writes entries in the key order of `files`, which it keeps as a null-prototype object.
  const files = Object.create(null);
  for (const name of ordered) files[name] = zip.files[name];
  zip.files = files;

  // DEFLATE entries keep their compressed bytes, so nothing is inflated here.
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

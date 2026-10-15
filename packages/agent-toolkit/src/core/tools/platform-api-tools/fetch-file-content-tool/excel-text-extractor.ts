import { Readable } from 'stream';
import ExcelJS from 'exceljs';

const MAX_EXCEL_TEXT_LENGTH = 5_000_000;
export const EXCEL_PARSE_DEADLINE_MS = 20_000;

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('result' in value) return cellToString((value as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
    if ('richText' in value) return (value as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join('');
    if ('hyperlink' in value) return (value as ExcelJS.CellHyperlinkValue).text ?? '';
  }
  return '';
}

interface ExcelExtractionOptions {
  maxTextLength?: number;
  deadlineMs?: number;
  now?: () => number;
}

export interface ExcelExtractionResult {
  text: string;
  truncatedBy?: 'size' | 'time';
}

// WorksheetReader typings omit `name`, which the reader sets from the workbook's sheet list.
type NamedWorksheetReader = ExcelJS.stream.xlsx.WorksheetReader & { name: string };

function rowToLine(values: ExcelJS.CellValue[]): string {
  let end = values.length;
  while (end > 0 && cellToString(values[end - 1]) === '') end--;
  return values.slice(0, end).map(cellToString).join(',');
}

const LOCAL_HEADER_SIG = 0x04034b50;
const CENTRAL_HEADER_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
const EOCD_MIN_SIZE = 22;
const MAX_ZIP_COMMENT = 0xffff;
const METADATA_ENTRIES = ['xl/_rels/workbook.xml.rels', 'xl/workbook.xml', 'xl/sharedStrings.xml', 'xl/styles.xml'];
const SHARED_STRINGS_ENTRY = 'xl/sharedStrings.xml';
const EMPTY_SHARED_STRINGS = Buffer.from(
  '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"/>',
);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function storedEntry(name: string, content: Buffer): Buffer {
  const nameBytes = Buffer.from(name, 'utf8');
  const header = Buffer.alloc(30);
  header.writeUInt32LE(LOCAL_HEADER_SIG, 0);
  header.writeUInt16LE(20, 4); // version needed
  header.writeUInt16LE(0, 6); // flags
  header.writeUInt16LE(0, 8); // method: stored
  header.writeUInt16LE(0, 10); // time
  header.writeUInt16LE(0x21, 12); // date: 1980-01-01
  header.writeUInt32LE(crc32(content), 14);
  header.writeUInt32LE(content.length, 18);
  header.writeUInt32LE(content.length, 22);
  header.writeUInt16LE(nameBytes.length, 26);
  header.writeUInt16LE(0, 28); // extra length
  return Buffer.concat([header, nameBytes, content]);
}

interface ZipEntry {
  name: string;
  offset: number;
}

function readCentralDirectory(buffer: Buffer): { entries: ZipEntry[]; cdOffset: number } | undefined {
  const searchStart = Math.max(0, buffer.length - EOCD_MIN_SIZE - MAX_ZIP_COMMENT);
  let eocd = -1;
  for (let i = buffer.length - EOCD_MIN_SIZE; i >= searchStart; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return undefined;

  const total = buffer.readUInt16LE(eocd + 10);
  const cdSize = buffer.readUInt32LE(eocd + 12);
  const cdOffset = buffer.readUInt32LE(eocd + 16);
  if (total === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) return undefined;
  if (cdOffset + cdSize > eocd) return undefined;

  const entries: ZipEntry[] = [];
  let pos = cdOffset;
  for (let i = 0; i < total; i++) {
    if (pos + 46 > cdOffset + cdSize || buffer.readUInt32LE(pos) !== CENTRAL_HEADER_SIG) return undefined;
    const nameLength = buffer.readUInt16LE(pos + 28);
    const extraLength = buffer.readUInt16LE(pos + 30);
    const commentLength = buffer.readUInt16LE(pos + 32);
    const offset = buffer.readUInt32LE(pos + 42);
    const next = pos + 46 + nameLength + extraLength + commentLength;
    if (next > cdOffset + cdSize || offset >= cdOffset) return undefined;
    entries.push({ name: buffer.toString('utf8', pos + 46, pos + 46 + nameLength), offset });
    pos = next;
  }
  return { entries, cdOffset };
}

// ExcelJS spools sheets that precede sharedStrings/rels to temp files it only deletes after a full read.
function withMetadataEntriesFirst(buffer: Buffer): Buffer {
  const directory = readCentralDirectory(buffer);
  if (!directory || directory.entries.length === 0) return buffer;
  const { cdOffset } = directory;

  const entries = [...directory.entries].sort((a, b) => a.offset - b.offset);
  if (entries[0].offset !== 0) return buffer;
  const segments = new Map<string, Buffer>();
  const ordered: Array<{ name: string; segment: Buffer }> = [];
  for (let i = 0; i < entries.length; i++) {
    const start = entries[i].offset;
    const end = i + 1 < entries.length ? entries[i + 1].offset : cdOffset;
    if (end <= start + 30 || buffer.readUInt32LE(start) !== LOCAL_HEADER_SIG) return buffer;
    const segment = buffer.subarray(start, end);
    segments.set(entries[i].name, segment);
    ordered.push({ name: entries[i].name, segment });
  }

  const parts: Buffer[] = [];
  for (const name of METADATA_ENTRIES) {
    const segment = segments.get(name);
    if (segment) parts.push(segment);
    else if (name === SHARED_STRINGS_ENTRY) parts.push(storedEntry(name, EMPTY_SHARED_STRINGS));
  }
  for (const { name, segment } of ordered) {
    if (!METADATA_ENTRIES.includes(name)) parts.push(segment);
  }
  parts.push(buffer.subarray(cdOffset));
  return Buffer.concat(parts);
}

export async function extractTextFromExcel(
  buffer: Buffer,
  {
    maxTextLength = MAX_EXCEL_TEXT_LENGTH,
    deadlineMs = EXCEL_PARSE_DEADLINE_MS,
    now = Date.now,
  }: ExcelExtractionOptions = {},
): Promise<ExcelExtractionResult> {
  const startedAt = now();
  const input = Readable.from(withMetadataEntriesFirst(buffer));
  // The streaming reader skips data validations and merged ranges, which the full-workbook loader expands
  // cell by cell (a full-column validation alone is over a million entries), and it yields to the event loop.
  // `styles: 'cache'` is needed so date cells come back as Date instead of serial numbers.
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(input, {
    worksheets: 'emit',
    sharedStrings: 'cache',
    styles: 'cache',
    hyperlinks: 'ignore',
    entries: 'ignore',
  });

  const parts: string[] = [];
  let length = 0;
  let truncatedBy: ExcelExtractionResult['truncatedBy'];

  try {
    for await (const worksheet of reader) {
      const sheet = worksheet as NamedWorksheetReader;
      const header = `=== Sheet: ${sheet.name} ===`;
      const rows: string[] = [];
      parts.push(header);
      length += header.length + 2;
      for await (const row of sheet) {
        if (now() - startedAt > deadlineMs) {
          truncatedBy = 'time';
          break;
        }
        const line = rowToLine((row.values as ExcelJS.CellValue[]).slice(1));
        if (line === '') continue;
        rows.push(line);
        length += line.length + 1;
        if (length >= maxTextLength) {
          truncatedBy = 'size';
          break;
        }
      }
      parts[parts.length - 1] = `${header}\n${rows.join('\n')}`;
      if (truncatedBy) break;
    }
  } finally {
    input.destroy();
  }

  const text = parts.join('\n\n');
  if (!truncatedBy) return { text };
  return { text: text.slice(0, maxTextLength), truncatedBy };
}

import fs from 'fs';
import os from 'os';
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';
import { getDocumentProxy, extractText } from 'unpdf';
import { createMockApiClient } from '../test-utils/mock-api-client';
import { FETCH_FILE_CONTENT_XLSX_STREAMING_FLAG, FetchFileContentTool } from './fetch-file-content-tool';
import { extractTextFromExcel } from './excel-text-extractor';

jest.mock('unpdf', () => ({
  getDocumentProxy: jest.fn(),
  extractText: jest.fn(),
}));

jest.mock('mammoth', () => ({
  __esModule: true,
  default: {
    extractRawText: jest.fn(),
  },
}));

const mockGetDocumentProxy = getDocumentProxy as jest.MockedFunction<typeof getDocumentProxy>;
const mockExtractText = extractText as jest.MockedFunction<typeof extractText>;
const mockMammothExtractRawText = mammoth.extractRawText as jest.MockedFunction<typeof mammoth.extractRawText>;

function assetsGraphqlResponse(assets: Array<{ public_url: string; name: string; file_extension: string }>) {
  return {
    items: [{ assets }],
  };
}

async function makeXlsxBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  sheet.addRow(['col_a', 'col_b']);
  sheet.addRow([1, 2]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** ToolOutputType content is `string | Record<string, any>` — narrow for field access in tests */
function toolContentObject(content: string | Record<string, any>): Record<string, any> {
  if (typeof content === 'string') {
    throw new Error('Expected tool result content to be an object');
  }
  return content;
}

function firstFile(content: string | Record<string, any>): Record<string, any> {
  const obj = toolContentObject(content);
  if (!Array.isArray(obj.files) || obj.files.length === 0) {
    throw new Error('Expected files array in content');
  }
  return obj.files[0];
}

/** Minimal `fetch` response shape for `downloadWithSizeLimit` (Jest Node may not define `Response`) */
function createMockFetchResponse(init: {
  status?: number;
  ok?: boolean;
  /** Binary bodies: pass `Buffer` or `Uint8Array` (avoid `new Response(buffer)` — `Buffer` is not always a valid `BodyInit`) */
  body?: Uint8Array | string | Buffer;
  /** `null` = omit Content-Length header */
  contentLength?: string | null;
}): Pick<Response, 'ok' | 'status' | 'headers' | 'body'> {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  const bodyBytes =
    init.body === undefined
      ? new Uint8Array()
      : typeof init.body === 'string'
        ? new TextEncoder().encode(init.body)
        : new Uint8Array(init.body);

  const headers = {
    get(name: string) {
      if (name.toLowerCase() !== 'content-length') return null;
      if (init.contentLength === null) return null;
      if (init.contentLength !== undefined) return init.contentLength;
      return String(bodyBytes.byteLength);
    },
  };

  return {
    ok,
    status,
    headers,
    body: {
      getReader() {
        let sent = false;
        return {
          read: async () => {
            if (sent) return { done: true as const, value: undefined };
            sent = true;
            return { done: false as const, value: bodyBytes };
          },
          cancel: async () => {},
        };
      },
    },
  } as Pick<Response, 'ok' | 'status' | 'headers' | 'body'>;
}

describe('FetchFileContentTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;
  let fetchMock: jest.Mock;
  let previousFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    previousFetch = globalThis.fetch;
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    if (previousFetch !== undefined) {
      globalThis.fetch = previousFetch;
    } else {
      Reflect.deleteProperty(globalThis, 'fetch');
    }
  });

  const baseAsset = {
    public_url: 'https://files.example.com/doc.pdf',
    name: 'report.pdf',
    file_extension: 'pdf',
  };

  it('returns a message when the item has no assets', async () => {
    mocks.setResponse({ items: [] });

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '123', column_id: 'files' });

    expect(result.content).toMatchObject({
      message: expect.stringContaining('No file found'),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a message when assets array is empty', async () => {
    mocks.setResponse(assetsGraphqlResponse([]));

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '123', column_id: 'files' });

    expect(toolContentObject(result.content).message).toContain('No file found');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls GetItemAssets with item and column ids', async () => {
    mocks.setResponse(assetsGraphqlResponse([{ ...baseAsset, name: 'a.png' }]));

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    await tool.execute({ item_id: 'item_1', column_id: 'files_mkv' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('query GetItemAssets'),
      { itemId: 'item_1', columnId: 'files_mkv' },
    );
  });

  it('returns image metadata and public_url without downloading', async () => {
    mocks.setResponse(
      assetsGraphqlResponse([
        {
          public_url: 'https://cdn.example.com/pic.png',
          name: 'screenshot.png',
          file_extension: 'png',
        },
      ]),
    );

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files' });

    expect(firstFile(result.content)).toMatchObject({
      content_type: 'image',
      public_url: 'https://cdn.example.com/pic.png',
      file_extension: '.png',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses file_name hint for extension when the asset name has none', async () => {
    mocks.setResponse(
      assetsGraphqlResponse([
        {
          public_url: 'https://cdn.example.com/asset',
          name: 'upload',
          file_extension: '',
        },
      ]),
    );

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files', file_name: 'photo.jpeg' });

    expect(firstFile(result.content)).toMatchObject({
      content_type: 'image',
      file_extension: '.jpeg',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes file_extension from API when it has no leading dot', async () => {
    mocks.setResponse(
      assetsGraphqlResponse([
        {
          public_url: 'https://cdn.example.com/f',
          name: 'notes',
          file_extension: 'md',
        },
      ]),
    );
    fetchMock.mockResolvedValue(createMockFetchResponse({ body: '# hello', contentLength: '7' }));

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files' });

    expect(firstFile(result.content)).toMatchObject({
      content_type: 'text',
      text: '# hello',
      file_extension: '.md',
    });
  });

  it('returns utf-8 text for .txt files', async () => {
    mocks.setResponse(assetsGraphqlResponse([{ ...baseAsset, name: 'readme.txt', file_extension: 'txt' }]));
    fetchMock.mockResolvedValue(createMockFetchResponse({ body: 'plain text', contentLength: '10' }));

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files' });

    expect(firstFile(result.content)).toMatchObject({
      content_type: 'text',
      text: 'plain text',
      file_extension: '.txt',
    });
  });

  it('extracts text from PDF via unpdf', async () => {
    mocks.setResponse(assetsGraphqlResponse([baseAsset]));
    fetchMock.mockResolvedValue(
      createMockFetchResponse({ body: new Uint8Array(Buffer.from('%PDF-1.4 fake')), contentLength: '12' }),
    );
    mockGetDocumentProxy.mockResolvedValue({} as any);
    mockExtractText.mockResolvedValue({ text: 'extracted pdf' } as any);

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files' });

    expect(firstFile(result.content)).toMatchObject({
      content_type: 'pdf',
      text: 'extracted pdf',
    });
    expect(mockGetDocumentProxy).toHaveBeenCalled();
    expect(mockExtractText).toHaveBeenCalled();
  });

  it('extracts text from Word via mammoth', async () => {
    mocks.setResponse(
      assetsGraphqlResponse([{ public_url: 'https://x/w.docx', name: 'w.docx', file_extension: 'docx' }]),
    );
    fetchMock.mockResolvedValue(
      createMockFetchResponse({ body: new Uint8Array(Buffer.from('docx-bytes')), contentLength: '10' }),
    );
    mockMammothExtractRawText.mockResolvedValue({ value: 'word body', messages: [] } as any);

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files' });

    expect(firstFile(result.content)).toMatchObject({
      content_type: 'word',
      text: 'word body',
    });
    expect(mockMammothExtractRawText).toHaveBeenCalledWith({ buffer: expect.any(Buffer) });
  });

  it('extracts text from Excel per sheet', async () => {
    const xlsxBuf = await makeXlsxBuffer();
    mocks.setResponse(
      assetsGraphqlResponse([{ public_url: 'https://x/t.xlsx', name: 't.xlsx', file_extension: 'xlsx' }]),
    );
    fetchMock.mockResolvedValue(
      createMockFetchResponse({
        body: xlsxBuf,
        contentLength: String(xlsxBuf.length),
      }),
    );

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files' });

    expect(firstFile(result.content)).toMatchObject({
      content_type: 'excel',
      file_extension: '.xlsx',
    });
    expect(String(firstFile(result.content).text)).toContain('=== Sheet: Sheet1 ===');
    expect(String(firstFile(result.content).text)).toContain('col_a');
  });

  describe('Excel extraction', () => {
    async function toBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
      return Buffer.from(await workbook.xlsx.writeBuffer());
    }

    async function runTool(xlsxBuf: Buffer) {
      mocks.setResponse(
        assetsGraphqlResponse([{ public_url: 'https://x/t.xlsx', name: 't.xlsx', file_extension: 'xlsx' }]),
      );
      fetchMock.mockResolvedValue(createMockFetchResponse({ body: xlsxBuf, contentLength: String(xlsxBuf.length) }));
      const tool = new FetchFileContentTool(mocks.mockApiClient);
      return firstFile((await tool.execute({ item_id: '1', column_id: 'files' })).content);
    }

    it('renders every sheet, dates, formula results and rich text', async () => {
      const workbook = new ExcelJS.Workbook();
      const first = workbook.addWorksheet('First');
      first.addRow(['name', 'when', 'sum', 'note']);
      first.addRow([
        'a',
        new Date('2024-03-05T00:00:00.000Z'),
        { formula: 'B2*0+1+1', result: 2 },
        { richText: [{ text: 'rich ' }, { text: 'text', font: { bold: true } }] },
      ]);
      const second = workbook.addWorksheet('Second');
      second.addRow(['x', true, 3.5]);

      const file = await runTool(await toBuffer(workbook));

      expect(file.text).toBe(
        [
          '=== Sheet: First ===',
          'name,when,sum,note',
          'a,2024-03-05T00:00:00.000Z,2,rich text',
          '',
          '=== Sheet: Second ===',
          'x,true,3.5',
        ].join('\n'),
      );
      expect(file.extraction_truncated).toBeUndefined();
    });

    it('is not slowed down by full-column data validations', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Data');
      sheet.addRow(['a', 'b']);
      sheet.addRow([1, 2]);
      // Worksheet typings omit `dataValidations`, which ExcelJS writes as a range `sqref`.
      const { dataValidations } = sheet as unknown as {
        dataValidations: { add(address: string, validation: ExcelJS.DataValidation): void };
      };
      for (const col of ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) {
        dataValidations.add(`${col}1:${col}1048576`, { type: 'list', allowBlank: true, formulae: ['"x,y"'] });
      }
      const xlsxBuf = await toBuffer(workbook);

      const started = Date.now();
      const result = await extractTextFromExcel(xlsxBuf);
      const elapsed = Date.now() - started;

      expect(result.text).toBe('=== Sheet: Data ===\na,b\n1,2');
      expect((await runTool(xlsxBuf)).text).toBe('=== Sheet: Data ===\na,b\n1,2');
      expect(elapsed).toBeLessThan(10_000);
    }, 120_000);

    it('keeps output bounded for a value in the last column and ignores lone empty far-right cells', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Wide');
      sheet.addRow(['a', 'b']);
      sheet.addRow(['c', 'd']);
      sheet.getCell('XFD2').value = { formula: '""', result: '' };
      sheet.getCell('XFD3').value = 'far';
      const file = await runTool(await toBuffer(workbook));

      const lines = String(file.text).split('\n');
      expect(lines.slice(0, 3)).toEqual(['=== Sheet: Wide ===', 'a,b', 'c,d']);
      expect(lines[3].endsWith(',far')).toBe(true);
      expect(String(file.text).length).toBeLessThan(20_000);
    });

    it('stops at the text cap and reports truncation', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Big');
      for (let i = 0; i < 200; i++) sheet.addRow([`row-${i}`, 'x'.repeat(50)]);

      const result = await extractTextFromExcel(await toBuffer(workbook), { maxTextLength: 500 });

      expect(result.truncatedBy).toBe('size');
      expect(result.text.length).toBe(500);
      expect(result.text.startsWith('=== Sheet: Big ===\nrow-0,')).toBe(true);
    });

    it('stops at the deadline and returns what was read so far', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Slow');
      for (let i = 0; i < 50; i++) sheet.addRow([`row-${i}`]);
      let clock = 0;

      const result = await extractTextFromExcel(await toBuffer(workbook), {
        deadlineMs: 25,
        now: () => (clock += 10),
      });

      expect(result.truncatedBy).toBe('time');
      expect(result.text).toBe('=== Sheet: Slow ===\nrow-0\nrow-1');
    });

    describe('temp files and zip layout', () => {
      // exceljs resolves `tmp` from the hoisted root; the package ships no typings.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const tmp = require(require.resolve('tmp', { paths: [require.resolve('exceljs')] })) as {
        file: (...args: unknown[]) => unknown;
      };

      const tempEntries = () => fs.readdirSync(os.tmpdir()).filter((name) => name.startsWith(`tmp-${process.pid}-`));

      async function expectNoTempFiles(run: () => Promise<unknown>) {
        const before = tempEntries();
        const fileSpy = jest.spyOn(tmp, 'file');
        try {
          await run();
          expect(fileSpy).not.toHaveBeenCalled();
          expect(tempEntries()).toEqual(before);
        } finally {
          fileSpy.mockRestore();
        }
      }

      async function stringWorkbook(rows = 200): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Big');
        for (let i = 0; i < rows; i++) sheet.addRow([`row-${i}`, 'x'.repeat(50)]);
        return toBuffer(workbook);
      }

      it('writes sharedStrings.xml after the first sheet in ExcelJS output', async () => {
        const buf = await stringWorkbook();
        expect(buf.indexOf('xl/worksheets/sheet1.xml')).toBeGreaterThan(-1);
        expect(buf.indexOf('xl/sharedStrings.xml')).toBeGreaterThan(buf.indexOf('xl/worksheets/sheet1.xml'));
      });

      it('leaves no temp files when the size cap stops reading early', async () => {
        const buf = await stringWorkbook();
        await expectNoTempFiles(async () => {
          const result = await extractTextFromExcel(buf, { maxTextLength: 500 });
          expect(result.truncatedBy).toBe('size');
        });
      });

      it('leaves no temp files when the deadline stops reading early', async () => {
        const buf = await stringWorkbook();
        let clock = 0;
        await expectNoTempFiles(async () => {
          const result = await extractTextFromExcel(buf, { deadlineMs: 25, now: () => (clock += 10) });
          expect(result.truncatedBy).toBe('time');
          expect(result.text).toBe('=== Sheet: Big ===\nrow-0,' + 'x'.repeat(50) + '\nrow-1,' + 'x'.repeat(50));
        });
      });

      it('extracts a workbook without text cells and creates no temp files', async () => {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Nums');
        sheet.addRow([1, 2.5, true]);
        sheet.addRow([new Date('2024-03-05T00:00:00.000Z'), false, 7]);
        const buf = await toBuffer(workbook);

        const hasSharedStrings = buf.indexOf('xl/sharedStrings.xml') !== -1;
        expect(hasSharedStrings).toBe(false);
        await expectNoTempFiles(async () => {
          const result = await extractTextFromExcel(buf);
          expect(result).toEqual({ text: '=== Sheet: Nums ===\n1,2.5,true\n2024-03-05T00:00:00.000Z,false,7' });
        });
      });

      it('rejects a buffer that is not a zip archive', async () => {
        await expect(extractTextFromExcel(Buffer.from('definitely not an xlsx file'))).rejects.toThrow();
      });
    });

    it('separates sheets with a blank line, including empty ones', async () => {
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('First').addRow(['a']);
      workbook.addWorksheet('Empty');
      workbook.addWorksheet('Last').addRow(['b']);

      const result = await extractTextFromExcel(await toBuffer(workbook));

      expect(result.text).toBe('=== Sheet: First ===\na\n\n=== Sheet: Empty ===\n\n=== Sheet: Last ===\nb');
    });

    it('skips rows that only carry formatting', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Styled');
      sheet.addRow(['head', 'er']);
      for (let r = 5; r <= 1000; r++) {
        const cell = sheet.getCell(r, 1);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
        cell.font = { bold: true };
      }
      sheet.getCell('A1001').value = 'tail';

      const result = await extractTextFromExcel(await toBuffer(workbook));

      expect(result.text).toBe('=== Sheet: Styled ===\nhead,er\ntail');
    });

    it('does not report truncation for small workbooks', async () => {
      const result = await extractTextFromExcel(await makeXlsxBuffer());
      expect(result).toEqual({ text: '=== Sheet: Sheet1 ===\ncol_a,col_b\n1,2' });
    });

    it('surfaces truncation on the returned file object', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Huge');
      const line = 'y'.repeat(1000);
      for (let i = 0; i < 6000; i++) sheet.addRow([line]);

      const file = await runTool(await toBuffer(workbook));

      expect(file).toMatchObject({
        content_type: 'excel',
        extraction_truncated: true,
        has_more: true,
        next_offset: 50_000,
        total_length: 5_000_000,
      });
      expect(file.message).toContain('5000000 characters');
    }, 60_000);

    describe('xlsx streaming flag', () => {
      // A trailing empty-string formula: the streaming reader drops it, the legacy loader keeps its commas.
      async function workbookWithTrailingEmptyCell(): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Flag');
        sheet.addRow(['a', 'b']);
        sheet.getCell('D1').value = { formula: '""', result: '' };
        return toBuffer(workbook);
      }

      async function runToolWithFlag(xlsxBuf: Buffer, flagChecker?: (flagKey: string) => boolean) {
        mocks.setResponse(
          assetsGraphqlResponse([{ public_url: 'https://x/t.xlsx', name: 't.xlsx', file_extension: 'xlsx' }]),
        );
        fetchMock.mockResolvedValue(createMockFetchResponse({ body: xlsxBuf, contentLength: String(xlsxBuf.length) }));
        const tool = new FetchFileContentTool(mocks.mockApiClient, flagChecker && { deps: { flagChecker } });
        return firstFile((await tool.execute({ item_id: '1', column_id: 'files' })).content);
      }

      it('uses the streaming reader when the flag is on', async () => {
        const flagChecker = jest.fn().mockReturnValue(true);

        const file = await runToolWithFlag(await workbookWithTrailingEmptyCell(), flagChecker);

        expect(flagChecker).toHaveBeenCalledWith(FETCH_FILE_CONTENT_XLSX_STREAMING_FLAG);
        expect(file.text).toBe('=== Sheet: Flag ===\na,b');
      });

      it('uses the legacy loader when the flag is off', async () => {
        const file = await runToolWithFlag(await workbookWithTrailingEmptyCell(), () => false);

        expect(file.text).toBe('=== Sheet: Flag ===\na,b,,');
      });

      it('uses the streaming reader when the host passes no flag checker', async () => {
        const file = await runToolWithFlag(await workbookWithTrailingEmptyCell());

        expect(file.text).toBe('=== Sheet: Flag ===\na,b');
      });
    });
  });

  it('treats unknown extensions as utf-8 with content_type unknown', async () => {
    mocks.setResponse(
      assetsGraphqlResponse([{ public_url: 'https://x/f.xyz', name: 'f.xyz', file_extension: 'xyz' }]),
    );
    fetchMock.mockResolvedValue(createMockFetchResponse({ body: 'raw', contentLength: '3' }));

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files' });

    expect(firstFile(result.content)).toMatchObject({
      content_type: 'unknown',
      text: 'raw',
    });
  });

  it('returns first chunk and pagination metadata when text exceeds 50k characters', async () => {
    mocks.setResponse(
      assetsGraphqlResponse([{ public_url: 'https://x/huge.txt', name: 'huge.txt', file_extension: 'txt' }]),
    );
    const longText = 'x'.repeat(60_000);
    fetchMock.mockResolvedValue(
      createMockFetchResponse({
        body: longText,
        contentLength: String(Buffer.byteLength(longText, 'utf8')),
      }),
    );

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files' });

    const file = firstFile(result.content);
    expect(String(file.text).length).toBe(50_000);
    expect(file.has_more).toBe(true);
    expect(file.next_offset).toBe(50_000);
    expect(file.total_length).toBe(60_000);
  });

  it('returns remaining chunk when offset is provided', async () => {
    mocks.setResponse(
      assetsGraphqlResponse([{ public_url: 'https://x/huge.txt', name: 'huge.txt', file_extension: 'txt' }]),
    );
    const longText = 'x'.repeat(60_000);
    fetchMock.mockResolvedValue(
      createMockFetchResponse({
        body: longText,
        contentLength: String(Buffer.byteLength(longText, 'utf8')),
      }),
    );

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files', offset: 50_000 });

    const file = firstFile(result.content);
    expect(String(file.text).length).toBe(10_000);
    expect(file.has_more).toBeUndefined();
    expect(file.total_length).toBe(60_000);
  });

  it('returns a failure message when download returns non-OK', async () => {
    mocks.setResponse(assetsGraphqlResponse([baseAsset]));
    fetchMock.mockResolvedValue(createMockFetchResponse({ status: 404, ok: false }));

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files' });

    expect(firstFile(result.content)).toMatchObject({
      message: expect.stringContaining('Failed to fetch file content'),
      file_name: 'report.pdf',
    });
    expect(String(firstFile(result.content).message)).toContain('HTTP 404');
  });

  it('rejects download when Content-Length exceeds 10 MB', async () => {
    mocks.setResponse(assetsGraphqlResponse([baseAsset]));
    const tooLarge = String(11 * 1024 * 1024);
    fetchMock.mockResolvedValue(createMockFetchResponse({ body: 'x', contentLength: tooLarge }));

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files' });

    expect(String(firstFile(result.content).message)).toContain('10 MB');
  });

  it('rejects download when streamed body exceeds 10 MB', async () => {
    mocks.setResponse(assetsGraphqlResponse([baseAsset]));
    const big = new Uint8Array(11 * 1024 * 1024);
    fetchMock.mockResolvedValue(createMockFetchResponse({ body: big, contentLength: null }));

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files' });

    expect(String(firstFile(result.content).message)).toContain('10 MB');
  });

  it('returns failure message when fetch times out', async () => {
    mocks.setResponse(assetsGraphqlResponse([baseAsset]));
    const abortError = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
    fetchMock.mockRejectedValue(abortError);

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files' });

    expect(String(firstFile(result.content).message)).toContain('Failed to fetch file content');
    expect(String(firstFile(result.content).message)).toContain('aborted');
  });

  it('processes all files when multiple assets are attached', async () => {
    mocks.setResponse(
      assetsGraphqlResponse([
        { public_url: 'https://x/a.txt', name: 'a.txt', file_extension: 'txt' },
        { public_url: 'https://x/b.txt', name: 'b.txt', file_extension: 'txt' },
      ]),
    );
    fetchMock
      .mockResolvedValueOnce(createMockFetchResponse({ body: 'first', contentLength: '5' }))
      .mockResolvedValueOnce(createMockFetchResponse({ body: 'second', contentLength: '6' }));

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files' });

    const { files } = toolContentObject(result.content);
    expect(files).toHaveLength(2);
    expect(files[0]).toMatchObject({ file_name: 'a.txt', text: 'first' });
    expect(files[1]).toMatchObject({ file_name: 'b.txt', text: 'second' });
  });

  it('returns failure message when extraction throws', async () => {
    mocks.setResponse(assetsGraphqlResponse([baseAsset]));
    fetchMock.mockResolvedValue(
      createMockFetchResponse({ body: new Uint8Array(Buffer.from('%PDF')), contentLength: '4' }),
    );
    mockGetDocumentProxy.mockRejectedValue(new Error('bad pdf'));

    const tool = new FetchFileContentTool(mocks.mockApiClient);
    const result = await tool.execute({ item_id: '1', column_id: 'files' });

    expect(String(firstFile(result.content).message)).toContain('bad pdf');
  });

  describe('tool metadata', () => {
    it('exposes expected name, type, annotations, and schema', () => {
      const tool = new FetchFileContentTool(mocks.mockApiClient);

      expect(tool.name).toBe('fetch_file_content');
      expect(tool.type).toBe('read');
      expect(tool.annotations.title).toBe('Fetch File Content');
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.getInputSchema().item_id).toBeDefined();
      expect(tool.getInputSchema().column_id).toBeDefined();
      expect(tool.getInputSchema().file_name).toBeDefined();
      expect(tool.getDescription()).toContain('files column');
    });
  });
});

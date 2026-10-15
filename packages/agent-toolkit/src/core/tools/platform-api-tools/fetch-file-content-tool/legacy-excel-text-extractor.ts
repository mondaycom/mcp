import ExcelJS from 'exceljs';
import { cellToString, ExcelExtractionResult } from './excel-text-extractor';

// The full-workbook loader used before the streaming reader. Kept only as the fallback while
// FETCH_FILE_CONTENT_XLSX_STREAMING_FLAG rolls out; delete it together with the flag.
export async function extractTextFromExcelLegacy(buffer: Buffer): Promise<ExcelExtractionResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const parts: string[] = [];
  workbook.eachSheet((sheet) => {
    const rows: string[] = [];
    sheet.eachRow((row) => {
      const values = (row.values as ExcelJS.CellValue[]).slice(1);
      rows.push(values.map(cellToString).join(','));
    });
    parts.push(`=== Sheet: ${sheet.name} ===\n${rows.join('\n')}`);
  });
  return { text: parts.join('\n\n') };
}

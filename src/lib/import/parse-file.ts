import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";

export type ParsedFile = {
  headers: string[];
  rows: string[][];
  truncated: boolean;
};

const MAX_ROWS = 2000;

export async function parseUploadedFile(
  buffer: Buffer,
  filename: string
): Promise<ParsedFile> {
  const isXlsx = /\.xlsx?$/i.test(filename);
  return isXlsx ? parseXlsx(buffer) : parseCsv(buffer);
}

function parseCsv(buffer: Buffer): ParsedFile {
  const records: string[][] = parse(buffer, {
    skip_empty_lines: true,
    relax_column_count: true,
  });

  if (records.length === 0) {
    return { headers: [], rows: [], truncated: false };
  }

  const [headerRow, ...dataRows] = records;
  const truncated = dataRows.length > MAX_ROWS;
  return {
    headers: headerRow.map((h) => h.trim()),
    rows: dataRows.slice(0, MAX_ROWS).map((row) => row.map((cell) => (cell ?? "").trim())),
    truncated,
  };
}

async function parseXlsx(buffer: Buffer): Promise<ParsedFile> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [], truncated: false };

  const allRows: string[][] = [];
  sheet.eachRow((row) => {
    const values = row.values as (string | number | Date | null)[];
    // exceljs row.values is 1-indexed (index 0 is always empty) — drop it.
    allRows.push(values.slice(1).map(cellToString));
  });

  if (allRows.length === 0) {
    return { headers: [], rows: [], truncated: false };
  }

  const [headerRow, ...dataRows] = allRows;
  const truncated = dataRows.length > MAX_ROWS;
  return {
    headers: headerRow.map((h) => h.trim()),
    rows: dataRows.slice(0, MAX_ROWS),
    truncated,
  };
}

function cellToString(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

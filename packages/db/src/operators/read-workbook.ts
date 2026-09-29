import ExcelJS from 'exceljs';
import type { Cell, Workbook } from './normalise';

/** Reads every sheet of an .xlsx file into plain 2-D arrays of cell values. */
export async function readWorkbook(path: string): Promise<Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const out: Workbook = {};
  wb.eachSheet((ws) => {
    const rows: Cell[][] = [];
    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const cells: Cell[] = [];
      for (let c = 1; c <= ws.columnCount; c++) {
        const v = row.getCell(c).value;
        cells.push(
          v === null || v === undefined
            ? null
            : typeof v === 'object' && 'richText' in v
              ? v.richText.map((t) => t.text).join('')
              : typeof v === 'object' && 'text' in v
                ? String(v.text)
                : typeof v === 'object' && 'result' in v
                  ? (v.result as Cell)
                  : (v as Cell),
        );
      }
      rows.push(cells);
    }
    out[ws.name] = rows;
  });
  return out;
}

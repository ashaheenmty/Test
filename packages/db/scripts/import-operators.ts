/**
 * Converts data/operators/Germany_Transport_Providers.xlsx into
 * data/operators/operators.json (committed, used by the seed).
 *
 *   pnpm operators:import [path/to/workbook.xlsx]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normaliseWorkbook } from '../src/operators/normalise';
import { readWorkbook } from '../src/operators/read-workbook';

const root = resolve(__dirname, '../../..');
const input = process.argv[2] ?? resolve(root, 'data/operators/Germany_Transport_Providers.xlsx');
const output = resolve(root, 'data/operators/operators.json');

async function main() {
  const wb = await readWorkbook(input);
  const data = normaliseWorkbook(wb);
  writeFileSync(output, JSON.stringify(data, null, 2) + '\n');
  const rows = Object.entries(wb)
    .filter(([name]) => name !== 'Overview')
    .reduce((n, [, r]) => n + r.length - 1, 0);
  console.log(`Read ${rows} rows (incl. footnotes) from ${input}`);
  console.log(
    `→ ${data.operators.length} operators, ${data.tariffAssociations.length} tariff associations, ` +
      `${data.cityTransit.length} city areas, ${data.salesChannels.length} sales channels/data sources`,
  );
  if (data.warnings.length) {
    console.log(`Warnings (${data.warnings.length}):`);
    for (const w of data.warnings) console.log(`  - ${w}`);
  }
  console.log(`Wrote ${output}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

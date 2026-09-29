// Builds the self-contained test build (single HTML page) shared for review.
// It bundles the real @tb/i18n, @tb/domain and @tb/config code and the imported
// operator data, so translations, fee rules and validation match the app.
//   node tools/test-build/build.mjs   → tools/test-build/dist/durch-deutschland-test.html
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const require = createRequire(resolve(root, 'packages/db/package.json'));
const esbuild = require(require.resolve('esbuild', { paths: [dirname(require.resolve('tsx/package.json'))] }));

const { outputFiles } = esbuild.buildSync({
  entryPoints: [resolve(here, 'entry.ts')],
  bundle: true, format: 'iife', globalName: 'TB', minify: true, platform: 'browser', target: 'es2020',
  write: false, nodePaths: [resolve(root, 'node_modules')],
});

const d = JSON.parse(readFileSync(resolve(root, 'data/operators/operators.json'), 'utf8'));
// Sales-channel coverage mirrors COVERAGE in packages/db/src/seed.ts.
const COV = { 'db-vertrieb': ['db-fernverkehr'], 'flix-partner-affiliate-api': ['flixtrain', 'flixbus'], 'osdm-open-sales-distribution-model': ['db-fernverkehr', 'oebb', 'sbb'], 'operator-direct-shops': ['eurostar', 'sncf-voyageurs', 'oebb', 'european-sleeper', 'snaelltaget', 'govolta', 'ceske-drahy', 'pkp-intercity'] };
const chBy = {}; for (const [k, v] of Object.entries(COV)) for (const s of v) (chBy[s] ??= []).push(k);
const cities = {}; for (const c of d.cityTransit) for (const s of c.operatorSlugs) (cities[s] ??= []).push(c.city + (c.tariffShortName ? ` (${c.tariffShortName})` : ''));
const data = {
  ops: d.operators.map((o) => ({ s: o.slug, n: o.name, c: o.country, g: o.groupName, st: o.status, why: o.statusReason || null, sg: o.segments, m: o.modes, b: o.brands, r: [...new Set(o.regions.filter((r) => r.type !== 'INTERNATIONAL_ROUTE').map((r) => r.code))], routes: o.regions.filter((r) => r.type === 'INTERNATIONAL_ROUTE').map((r) => r.description), ch: chBy[o.slug] || [], ci: cities[o.slug] || [], notes: o.notes })),
};

const html = readFileSync(resolve(here, 'template.html'), 'utf8')
  .replace('/*__TB__*/', () => outputFiles[0].text.replace(/<\/script/gi, '<\\/script'))
  .replace('/*__DATA__*/', () => JSON.stringify(data).replace(/<\//g, '<\\/'));
mkdirSync(resolve(here, 'dist'), { recursive: true });
writeFileSync(resolve(here, 'dist/durch-deutschland-test.html'), html);
console.log(`Wrote tools/test-build/dist/durch-deutschland-test.html (${Math.round(html.length / 1024)} KB)`);

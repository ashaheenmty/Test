/**
 * Normalises the "Germany Transport Providers – Master List" workbook into
 * de-duplicated reference data (operators, tariff associations, city transit
 * areas, sales channels).
 *
 * The spreadsheet lists many operators once per federal state and uses
 * slightly different spellings across tabs, so this module:
 *   - derives a canonical name (strips parenthetical brand info, applies ALIASES),
 *   - merges rows with the same canonical name, accumulating regions/brands/modes,
 *   - applies explicit STATUS_OVERRIDES for rows that are known to be outdated.
 *
 * Every assumption lives in the constant tables below so it can be reviewed.
 */

import type {
  MerchantOfRecord,
  OperatorSegment,
  OrganisationStatus,
  SalesChannelKind,
  TransportMode,
} from '@tb/domain';

export type Cell = string | number | null | undefined;
export type SheetRows = Cell[][];
export type Workbook = Record<string, SheetRows>;

export interface SourceRef {
  sheet: string;
  row: number;
}

export interface NormalisedRegion {
  type: 'FEDERAL_STATE' | 'CITY' | 'COUNTRY' | 'INTERNATIONAL_ROUTE';
  code: string;
  description?: string;
}

export interface NormalisedOperator {
  slug: string;
  name: string;
  country: string;
  groupName: string | null;
  brands: string[];
  segments: OperatorSegment[];
  modes: TransportMode[];
  serviceTypes: string[];
  coverage: string[];
  ownSalesChannel: string | null;
  notes: string[];
  status: OrganisationStatus;
  statusReason?: string;
  regions: NormalisedRegion[];
  sources: SourceRef[];
}

export interface NormalisedTariffAssociation {
  slug: string;
  shortName: string;
  fullName: string;
  area: string;
  kind: 'VERBUND' | 'NATIONAL_TARIFF' | 'NATIONAL_PASS';
  source: SourceRef;
}

export interface NormalisedCityArea {
  city: string;
  state: string;
  modes: string;
  operatorSlugs: string[];
  tariffShortName: string | null;
  tariffNote: string | null;
  source: SourceRef;
}

export interface NormalisedSalesChannel {
  code: string;
  name: string;
  kind: SalesChannelKind;
  coverage: string;
  relevance: string | null;
  status: OrganisationStatus;
  merchantOfRecord: MerchantOfRecord | null;
  hostedPaymentRequired: boolean;
  throughTicketSupport: boolean;
  adapterKey: string | null;
  assumptions: string[];
  source: SourceRef;
}

export interface NormalisedData {
  importedAt: string;
  sourceTitle: string;
  operators: NormalisedOperator[];
  tariffAssociations: NormalisedTariffAssociation[];
  cityTransit: NormalisedCityArea[];
  salesChannels: NormalisedSalesChannel[];
  warnings: string[];
}

// ───────────────────────────── Lookup tables ─────────────────────────────

/** Spelling variants → canonical operator name. Keys are lower-cased base names. */
export const ALIASES: Record<string, string> = {
  avg: 'Albtal-Verkehrs-Gesellschaft',
  'albtal-verkehrs-gesellschaft': 'Albtal-Verkehrs-Gesellschaft',
  sweg: 'SWEG Südwestdeutsche Landesverkehrs-GmbH',
  'sweg südwestdeutsche landesverkehrs-gmbh': 'SWEG Südwestdeutsche Landesverkehrs-GmbH',
  evb: 'EVB Eisenbahnen und Verkehrsbetriebe Elbe-Weser',
  'db sylt shuttle': 'DB Fernverkehr',
  'db regio': 'DB Regio Saar',
  'snc f / ter grand est': 'SNCF Voyageurs',
  'sncf / ter grand est': 'SNCF Voyageurs',
  'sncf voyageurs': 'SNCF Voyageurs',
  öbb: 'ÖBB',
  'öbb nightjet + euronight partners': 'ÖBB',
  'rdc deutschland': 'RDC Deutschland',
  saarbahn: 'Saarbahn',
  'saarbahn gmbh': 'Saarbahn',
  'erixx holstein': 'erixx Holstein',
  akn: 'AKN Eisenbahn',
  regiotram: 'RegioTram Kassel',
  'regiotram kassel': 'RegioTram Kassel',
  'eurostar': 'Eurostar',
  // DB S-Bahn brands in the city tab are operated by the DB Regio units below.
  's-bahn münchen': 'DB Regio Bayern',
  's-bahn rhein-main': 'DB Regio Hessen',
  's-bahn stuttgart': 'DB Regio Baden-Württemberg',
  's-bahn mitteldeutschland': 'DB Regio Südost',
  's-bahn rostock': 'DB Regio Nordost',
  's-bahn berlin': 'S-Bahn Berlin GmbH',
  's-bahn hamburg': 'S-Bahn Hamburg GmbH',
};

/**
 * Explicit status corrections relative to the import date (spreadsheet compiled 27 Sep 2026).
 * Keys are canonical names.
 */
export const STATUS_OVERRIDES: Record<string, { status: OrganisationStatus; reason: string }> = {
  SJ: {
    status: 'INACTIVE',
    reason: 'Sheet: SJ role on Berlin/Hamburg–Stockholm ends Aug 2026; RDC Deutschland takes over.',
  },
  'Abellio Rail Mitteldeutschland': {
    status: 'NEEDS_REVIEW',
    reason: 'Sheet: went through insolvency; check current contracts.',
  },
  GoVolta: {
    status: 'ACTIVE',
    reason: 'Sheet: Hamburg route withdrawn; Amsterdam–Paris only planned Dec 2026.',
  },
};

export const STATE_CODES: Record<string, string> = {
  'baden-württemberg': 'DE-BW',
  bw: 'DE-BW',
  bavaria: 'DE-BY',
  bayern: 'DE-BY',
  berlin: 'DE-BE',
  brandenburg: 'DE-BB',
  bremen: 'DE-HB',
  hamburg: 'DE-HH',
  hessen: 'DE-HE',
  'lower saxony': 'DE-NI',
  niedersachsen: 'DE-NI',
  'mecklenburg-vorpommern': 'DE-MV',
  'north rhine-westphalia': 'DE-NW',
  nrw: 'DE-NW',
  'rhineland-palatinate': 'DE-RP',
  rlp: 'DE-RP',
  saarland: 'DE-SL',
  saxony: 'DE-SN',
  sachsen: 'DE-SN',
  'saxony-anhalt': 'DE-ST',
  'sachsen-anhalt': 'DE-ST',
  'schleswig-holstein': 'DE-SH',
  thuringia: 'DE-TH',
  thüringen: 'DE-TH',
};

const COUNTRY_CODES: Record<string, string> = {
  germany: 'DE',
  france: 'FR',
  austria: 'AT',
  switzerland: 'CH',
  'czech republic': 'CZ',
  poland: 'PL',
  netherlands: 'NL',
  belgium: 'BE',
  luxembourg: 'LU',
  denmark: 'DK',
  sweden: 'SE',
  'france/belgium/nl/uk': 'BE', // Eurostar Group SA, Brussels
};

/** Sales-channel attributes that the sheet does not contain. ASSUMPTIONS until contracts exist. */
const CHANNEL_DEFAULTS: Record<
  string,
  Partial<Pick<NormalisedSalesChannel, 'merchantOfRecord' | 'hostedPaymentRequired' | 'throughTicketSupport' | 'adapterKey'>>
> = {
  'db-vertrieb': {
    merchantOfRecord: 'AGENT_PLATFORM_SPLIT',
    throughTicketSupport: true,
    adapterKey: 'mock-db-vertrieb',
  },
  'flix-partner-affiliate-api': { merchantOfRecord: 'OPERATOR', adapterKey: 'mock-flix' },
  'osdm-open-sales-distribution-model': { merchantOfRecord: 'AGENT_PLATFORM_SPLIT', throughTicketSupport: true, adapterKey: 'mock-osdm' },
  'operator-direct-shops': {
    merchantOfRecord: 'OPERATOR',
    hostedPaymentRequired: true,
    adapterKey: 'mock-hosted-operator',
  },
  'mobilitybox-tracsis': { merchantOfRecord: 'DISTRIBUTOR', adapterKey: 'mock-oepnv' },
  'trainline-omio-rail-europe': { merchantOfRecord: 'DISTRIBUTOR', adapterKey: 'mock-wholesale' },
};

const CHANNEL_KIND_BY_TYPE: Record<string, SalesChannelKind> = {
  'sales channel': 'OPERATOR_DIRECT',
  'tariff body': 'TARIFF_BODY',
  'open data': 'DATA_SOURCE',
  'timetable data': 'DATA_SOURCE',
  'european standard': 'OSDM',
  'aggregators (competitors)': 'AGGREGATOR',
  'ticket api': 'OEPNV_API',
  'check-in/check-out ticketing': 'CHECK_IN_CHECK_OUT',
  'former industry platform': 'OEPNV_API',
};

// ───────────────────────────── Helpers ─────────────────────────────

const str = (c: Cell): string => (c === null || c === undefined ? '' : String(c).trim());

export function slugify(s: string): string {
  return s
    .replace(/ä/gi, 'ae')
    .replace(/ö/gi, 'oe')
    .replace(/ü/gi, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Splits "Name (extra info)" into base and parenthetical parts. */
export function splitName(raw: string): { base: string; extra: string | null } {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(raw.trim());
  return m ? { base: m[1]!.trim(), extra: m[2]!.trim() } : { base: raw.trim(), extra: null };
}

export function canonicalName(raw: string): string {
  const full = raw.trim().toLowerCase();
  if (ALIASES[full]) return ALIASES[full]!;
  const { base } = splitName(raw);
  return ALIASES[base.toLowerCase()] ?? base;
}

/** Parenthetical words that are descriptions, not brands. */
const NOT_A_BRAND = /^(transdev|stadtwerke|bus network|bus|ferries|stadtbahn|saar|with\s|formerly\s)/i;

function brandsFrom(raw: string, canonical: string): string[] {
  const { extra } = splitName(raw);
  if (!extra || /\bDB\b$/.test(extra)) return [];
  return extra
    .replace(/^incl\.\s*/i, '')
    .split(/\s*,\s*|\s+\/\s+/)
    .map((b) => b.replace(/\s*etc\.?$/i, '').trim())
    .filter((b) => b && !NOT_A_BRAND.test(b) && !canonical.includes(b));
}

const MODE_PATTERNS: [RegExp, TransportMode][] = [
  [/\b(ICE|TGV|high[ -]speed|Railjet|ComfortJet|ECE)\b/i, 'HIGH_SPEED_RAIL'],
  [/\b(IC2?|EC|EuroCity|InterCity|FLX|long[ -]distance|IRE)\b/i, 'LONG_DISTANCE_RAIL'],
  [/\b(RE|RB|MEX|RRX|regional|Regio(?!-S)|A-lines|Tram-train|1 line|S 28|RE \d+|RB \d+)\b/i, 'REGIONAL_RAIL'],
  [/S-Bahn|Regio-S-Bahn|\bS \d+\b/i, 'S_BAHN'],
  [/U-Bahn/i, 'U_BAHN'],
  [/\btram/i, 'TRAM'],
  [/Stadtbahn/i, 'STADTBAHN'],
  [/\bbus\b/i, 'BUS'],
  [/ferr(y|ies)/i, 'FERRY'],
  [/night/i, 'NIGHT_TRAIN'],
  [/car[- ](carrier|train|shuttle)/i, 'CAR_TRAIN'],
  [/rack/i, 'RACK_RAILWAY'],
  [/funicular/i, 'FUNICULAR'],
  [/heritage|narrow-gauge/i, 'HERITAGE_RAIL'],
  [/Schwebebahn|suspension/i, 'SUSPENSION_RAILWAY'],
  [/H-Bahn/i, 'OTHER'],
];

export function inferModes(text: string): TransportMode[] {
  return MODE_PATTERNS.filter(([re]) => re.test(text)).map(([, m]) => m);
}

function countryFrom(text: string): string {
  const t = text.toLowerCase().trim();
  if (COUNTRY_CODES[t]) return COUNTRY_CODES[t]!;
  const first = t.split(/[\s/(,]+/)[0] ?? '';
  const withTwo = t.split(/\s*\(/)[0] ?? '';
  return COUNTRY_CODES[withTwo] ?? COUNTRY_CODES[first] ?? 'DE';
}

function groupFrom(text: string): string | null {
  const m = /\(([^)]+)\)/.exec(text);
  return m ? m[1]!.trim() : null;
}

function statesFrom(text: string): string[] {
  const parts = text.split(/\s*\/\s*|\s*\(\s*|\s*\)\s*/).map((p) => p.trim().toLowerCase());
  return [...new Set(parts.map((p) => STATE_CODES[p]).filter((c): c is string => Boolean(c)))];
}

/** Data rows only: skips the header and trailing footnote rows (only first cell filled). */
function dataRows(rows: SheetRows): { cells: Cell[]; row: number }[] {
  return rows
    .map((cells, i) => ({ cells, row: i + 1 }))
    .slice(1)
    .filter(({ cells }) => cells.slice(1).some((c) => str(c) !== ''));
}

function sheet(wb: Workbook, name: string, warnings: string[]): SheetRows {
  const rows = wb[name];
  if (!rows) {
    warnings.push(`Sheet "${name}" missing`);
    return [];
  }
  return rows;
}

const uniq = <T>(xs: T[]): T[] => [...new Set(xs)];

// ───────────────────────────── Main ─────────────────────────────

export function normaliseWorkbook(wb: Workbook, importedAt = new Date()): NormalisedData {
  const warnings: string[] = [];
  const ops = new Map<string, NormalisedOperator>();

  function upsert(
    rawName: string,
    source: SourceRef,
    patch: {
      country?: string;
      groupName?: string | null;
      segments?: OperatorSegment[];
      modes?: TransportMode[];
      serviceType?: string;
      coverage?: string;
      ownSalesChannel?: string;
      note?: string;
      region?: NormalisedRegion;
    },
  ): NormalisedOperator {
    const name = canonicalName(rawName);
    const slug = slugify(name);
    let op = ops.get(slug);
    if (!op) {
      op = {
        slug,
        name,
        country: patch.country ?? 'DE',
        groupName: patch.groupName ?? null,
        brands: [],
        segments: [],
        modes: [],
        serviceTypes: [],
        coverage: [],
        ownSalesChannel: null,
        notes: [],
        status: 'ACTIVE',
        regions: [],
        sources: [],
      };
      ops.set(slug, op);
    }
    op.brands = uniq([...op.brands, ...brandsFrom(rawName, name)]);
    const former = /\(formerly ([^)]+)\)/i.exec(rawName);
    if (former) op.notes = uniq([...op.notes, `Formerly ${former[1]}`]);
    op.segments = uniq([...op.segments, ...(patch.segments ?? [])]);
    op.modes = uniq([...op.modes, ...(patch.modes ?? [])]);
    if (patch.serviceType) op.serviceTypes = uniq([...op.serviceTypes, patch.serviceType]);
    if (patch.coverage) op.coverage = uniq([...op.coverage, patch.coverage]);
    if (patch.note) op.notes = uniq([...op.notes, patch.note]);
    if (patch.ownSalesChannel && !op.ownSalesChannel) op.ownSalesChannel = patch.ownSalesChannel;
    if (!op.groupName && patch.groupName) op.groupName = patch.groupName;
    if (patch.region && !op.regions.some((r) => r.type === patch.region!.type && r.code === patch.region!.code)) {
      op.regions.push(patch.region);
    }
    op.sources.push(source);
    return op;
  }

  // Long-distance DE
  for (const { cells, row } of dataRows(sheet(wb, 'Long-distance DE', warnings))) {
    const [provider, owner, types, coverage, notes, channel] = cells.map(str);
    const night = /night|holiday/i.test(`${types} ${notes}`);
    upsert(provider!, { sheet: 'Long-distance DE', row }, {
      country: 'DE',
      groupName: owner || null,
      segments: [night ? 'NIGHT' : 'LONG_DISTANCE', ...(/cross-border/i.test(coverage!) ? ['CROSS_BORDER' as const] : [])],
      modes: inferModes(`${types}`),
      serviceType: types,
      coverage,
      note: notes,
      ownSalesChannel: channel,
      region: { type: 'COUNTRY', code: 'DE', description: coverage },
    });
    if (/Sylt Shuttle/.test(notes!)) ops.get(slugify(canonicalName(provider!)))!.brands.push('Sylt Shuttle');
  }

  // Cross-border & international
  for (const { cells, row } of dataRows(sheet(wb, 'Cross-border & Intl', warnings))) {
    const [provider, countryGroup, serviceType, route, channel] = cells.map(str);
    const segments: OperatorSegment[] = ['CROSS_BORDER'];
    if (/night/i.test(serviceType!)) segments.push('NIGHT');
    else if (/regional/i.test(serviceType!)) segments.push('REGIONAL');
    else segments.push('LONG_DISTANCE');
    const country = countryFrom(countryGroup!);
    const op = upsert(provider!, { sheet: 'Cross-border & Intl', row }, {
      country,
      groupName: groupFrom(countryGroup!),
      segments,
      modes: inferModes(`${serviceType} ${provider}`),
      serviceType,
      ownSalesChannel: channel,
      region: { type: 'INTERNATIONAL_ROUTE', code: slugify(route!).slice(0, 60), description: route },
    });
    if (/Nightjet/i.test(provider!)) op.brands = uniq([...op.brands, 'Nightjet', 'EuroNight']);
    if (/TGV INOUI/.test(provider!)) op.brands = uniq([...op.brands, 'TGV INOUI']);
    if (/TER Grand Est/.test(provider!)) op.brands = uniq([...op.brands, 'TER Grand Est']);
    if (!op.regions.some((r) => r.type === 'COUNTRY' && r.code === country)) {
      op.regions.push({ type: 'COUNTRY', code: country });
    }
  }

  // Regional by state
  for (const { cells, row } of dataRows(sheet(wb, 'Regional by State', warnings))) {
    const [state, operator, owner, types, notes] = cells.map(str);
    const code = STATE_CODES[state!.split(' (')[0]!.toLowerCase()];
    if (!code) warnings.push(`Unknown state "${state}" (Regional by State row ${row})`);
    const heritage = /heritage|narrow-gauge/i.test(types!);
    const foreign = countryFrom(owner!);
    upsert(operator!, { sheet: 'Regional by State', row }, {
      country: foreign,
      groupName: owner || null,
      segments: [heritage ? 'HERITAGE' : 'REGIONAL', ...(/cross-border/i.test(types!) ? ['CROSS_BORDER' as const] : [])],
      modes: inferModes(`${types} ${operator}`),
      serviceType: types,
      note: notes || undefined,
      region: code ? { type: 'FEDERAL_STATE', code, description: notes || undefined } : undefined,
    });
  }

  // Tariff associations
  const tariffs: NormalisedTariffAssociation[] = [];
  for (const { cells, row } of dataRows(sheet(wb, 'Tariff Associations', warnings))) {
    const [short, full, area] = cells.map(str);
    const shortName = short!;
    const kind = /Deutschland-Ticket/.test(shortName)
      ? 'NATIONAL_PASS'
      : /Deutschlandtarif/.test(shortName)
        ? 'NATIONAL_TARIFF'
        : 'VERBUND';
    tariffs.push({
      slug: slugify(shortName),
      shortName,
      fullName: full!,
      area: area!,
      kind,
      source: { sheet: 'Tariff Associations', row },
    });
  }
  const tariffByKey = new Map<string, NormalisedTariffAssociation>();
  for (const t of tariffs) {
    tariffByKey.set(t.shortName.toLowerCase(), t);
    tariffByKey.set(t.shortName.replace(/[()]/g, '').toLowerCase(), t);
  }

  // City transit
  const cityTransit: NormalisedCityArea[] = [];
  for (const { cells, row } of dataRows(sheet(wb, 'City Transit', warnings))) {
    const [city, state, operatorsRaw, modesRaw, verbundRaw] = cells.map(str);
    const source = { sheet: 'City Transit', row };
    const cityModes = inferModes(modesRaw!);
    const operatorSlugs: string[] = [];
    for (const raw of operatorsRaw!.split(/\s*;\s*/).filter(Boolean)) {
      const isSBahn = /^S-Bahn/i.test(raw);
      const modes = isSBahn
        ? (['S_BAHN'] as TransportMode[])
        : cityModes.filter((m) => m !== 'S_BAHN');
      const stateCodes = statesFrom(state!);
      const op = upsert(raw, source, {
        country: 'DE',
        groupName: splitName(raw).extra && !/DB|bus network/.test(splitName(raw).extra!) ? splitName(raw).extra : null,
        segments: [isSBahn ? 'REGIONAL' : 'CITY_TRANSIT'],
        modes,
        region: { type: 'CITY', code: city! },
      });
      for (const sc of stateCodes) {
        if (!op.regions.some((r) => r.type === 'FEDERAL_STATE' && r.code === sc)) {
          op.regions.push({ type: 'FEDERAL_STATE', code: sc });
        }
      }
      operatorSlugs.push(op.slug);
    }
    let tariffShortName: string | null = null;
    let tariffNote: string | null = null;
    if (verbundRaw && verbundRaw !== '—') {
      const { base, extra } = splitName(verbundRaw);
      const [first, ...rest] = base.split(/\s*\/\s*/);
      const candidates = [verbundRaw, base, first!, base.replace(/\s+/, ' (') + ')'].map((c) => c.toLowerCase());
      const hit = candidates.map((c) => tariffByKey.get(c)).find(Boolean);
      if (hit) tariffShortName = hit.shortName;
      else warnings.push(`City "${city}": tariff association "${verbundRaw}" not in Tariff Associations tab`);
      tariffNote = [extra, ...rest].filter(Boolean).join('; ') || null;
    }
    cityTransit.push({
      city: city!,
      state: state!,
      modes: modesRaw!,
      operatorSlugs: uniq(operatorSlugs),
      tariffShortName,
      tariffNote,
      source,
    });
  }

  // Long-distance bus
  for (const { cells, row } of dataRows(sheet(wb, 'Long-distance Bus', warnings))) {
    const [provider, owner, coverage, notes] = cells.map(str);
    const name = splitName(provider!).base;
    upsert(provider!, { sheet: 'Long-distance Bus', row }, {
      country: /CZ/.test(owner!) ? 'CZ' : /BlaBlaCar/.test(owner!) ? 'FR' : 'DE',
      groupName: owner || null,
      segments: ['LONG_DISTANCE_BUS', ...(/Europe|Prague/.test(coverage!) ? ['CROSS_BORDER' as const] : [])],
      modes: ['COACH'],
      coverage,
      note: notes || undefined,
      region: { type: 'COUNTRY', code: 'DE', description: coverage },
    });
  }

  // Sales channels & data access
  const salesChannels: NormalisedSalesChannel[] = [];
  for (const { cells, row } of dataRows(sheet(wb, 'Booking & Data Access', warnings))) {
    const [nameRaw, type, covers, relevance] = cells.map(str);
    const code = slugify(splitName(nameRaw!).base === 'DB Vertrieb' ? 'db-vertrieb' : nameRaw!);
    let kind = CHANNEL_KIND_BY_TYPE[type!.toLowerCase()] ?? 'OPERATOR_DIRECT';
    if (code === 'db-vertrieb') kind = 'NATIONAL_RETAILER';
    const discontinued = /discontinued|shut down/i.test(`${covers} ${relevance}`);
    const defaults = CHANNEL_DEFAULTS[code] ?? {};
    salesChannels.push({
      code,
      name: nameRaw!,
      kind,
      coverage: covers!,
      relevance: relevance || null,
      status: discontinued ? 'DISCONTINUED' : 'ACTIVE',
      merchantOfRecord: defaults.merchantOfRecord ?? null,
      hostedPaymentRequired: defaults.hostedPaymentRequired ?? false,
      throughTicketSupport: defaults.throughTicketSupport ?? false,
      adapterKey: discontinued ? null : (defaults.adapterKey ?? null),
      assumptions: Object.keys(defaults).length
        ? ['merchantOfRecord / hosted payment / through-ticket flags are assumptions until a contract exists']
        : [],
      source: { sheet: 'Booking & Data Access', row },
    });
  }

  // Status overrides
  for (const op of ops.values()) {
    const o = STATUS_OVERRIDES[op.name];
    if (o) {
      op.status = o.status;
      op.statusReason = o.reason;
    }
    if (op.modes.length === 0) warnings.push(`No transport mode inferred for "${op.name}"`);
  }
  for (const key of Object.keys(STATUS_OVERRIDES)) {
    if (!ops.has(slugify(key))) warnings.push(`Status override for unknown operator "${key}"`);
  }

  const titleRow = wb['Overview']?.[0]?.[0];
  return {
    importedAt: importedAt.toISOString(),
    sourceTitle: str(titleRow) || 'Germany Transport Providers – Master List',
    operators: [...ops.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
    tariffAssociations: tariffs,
    cityTransit,
    salesChannels,
    warnings,
  };
}

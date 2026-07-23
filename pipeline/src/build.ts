// Compute the real-price index per good (base 1980, childcare 1990), the direction
// flags, the tangible-$ callouts, and the stamp beat-2 arrays. Write committed JSON
// to src/data/. Run: `npm run data` (node --experimental-strip-types). No cron; the
// output is committed so Vercel's build is hermetic.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadAll } from './download.ts';
import { SOURCES, DEFLATOR } from './series.ts';
import type { Good, SeriesData, Direction } from '../../src/lib/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GLOBAL_BASE = 1980;

type Annual = Map<number, number>;

/** FRED CSV (monthly) -> annual mean of complete (>=12 month) years. */
function parseFredAnnual(csv: string): Annual {
  const byYear = new Map<number, number[]>();
  for (const line of csv.split('\n')) {
    const m = line.match(/^(\d{4})-\d{2}-\d{2},([\d.]+)\s*$/);
    if (!m) continue;
    const year = Number(m[1]);
    const v = Number(m[2]);
    if (!Number.isFinite(v)) continue;
    (byYear.get(year) ?? byYear.set(year, []).get(year)!).push(v);
  }
  const out: Annual = new Map();
  for (const [year, vals] of byYear) {
    if (vals.length >= 12) out.set(year, vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  return out;
}

/** BLS flat file -> the M13 (annual average) value per year for one series_id. */
function parseBlsAnnual(text: string, seriesId: string): Annual {
  const out: Annual = new Map();
  for (const line of text.split('\n')) {
    const cols = line.split('\t').map((c) => c.trim());
    if (cols[0] !== seriesId || cols[2] !== 'M13') continue;
    const year = Number(cols[1]);
    const v = Number(cols[3]);
    if (Number.isFinite(year) && Number.isFinite(v)) out.set(year, v);
  }
  return out;
}

function fmtMoney(v: number): string {
  return '$' + v.toFixed(2);
}
function fmtCents(v: number): string {
  return Math.round(v) + '¢';
}
function fmtTangible(unit: string, v: number): string {
  // stamp is in cents, gas/eggs in dollars
  return unit.includes('stamp') ? fmtCents(v) : fmtMoney(v);
}

function directionOf(realLatest: number): { flag: -1 | 0 | 1; word: Direction } {
  const d = realLatest - 100;
  if (d > 5) return { flag: 1, word: 'climbed' };
  if (d < -5) return { flag: -1, word: 'fell' };
  return { flag: 0, word: 'held' };
}

async function main() {
  const raw = await downloadAll();

  // deflator annual (CPI-U all items NSA)
  const deflator = parseFredAnnual(raw.fred.get(DEFLATOR.fredId)!);

  // stamp rate table (hand-entered cents by year)
  const stampJson = JSON.parse(
    await readFile(join(ROOT, 'pipeline', 'data', 'stamp-rates.json'), 'utf8'),
  ) as { rates: Record<string, number> };
  const stampAnnual: Annual = new Map(
    Object.entries(stampJson.rates).map(([y, c]) => [Number(y), c]),
  );

  // resolve each source's annual series
  const annualById = new Map<string, Annual>();
  for (const s of SOURCES) {
    if (s.seriesId === 'STAMP') { annualById.set(s.id, stampAnnual); continue; }
    if (s.src === 'fred') annualById.set(s.id, parseFredAnnual(raw.fred.get(s.seriesId)!));
    else annualById.set(s.id, parseBlsAnnual(raw.bls.get(s.blsFile!)!, s.seriesId));
  }

  // shared latest year = min last-complete-year across deflator + every good
  const lastYearOf = (a: Annual) => Math.max(...a.keys());
  let latestYear = lastYearOf(deflator);
  for (const s of SOURCES) latestYear = Math.min(latestYear, lastYearOf(annualById.get(s.id)!));

  const years: number[] = [];
  for (let y = GLOBAL_BASE; y <= latestYear; y++) years.push(y);

  const inflBaseToLatest = deflator.get(latestYear)! / deflator.get(GLOBAL_BASE)!;

  const goods: Good[] = SOURCES.map((s) => {
    const annual = annualById.get(s.id)!;
    const base = s.baseYear;
    const startYear = Math.max(s.baseYear, GLOBAL_BASE); // 1980, or 1990 for childcare
    const itemBase = annual.get(base)!;
    const deflBase = deflator.get(base)!;

    // real index aligned to years, null before startYear
    const real: (number | null)[] = years.map((y) => {
      if (y < startYear) return null;
      const item = annual.get(y);
      const defl = deflator.get(y);
      if (item == null || defl == null) return null;
      const v = (item / itemBase) / (defl / deflBase) * 100;
      return Math.round(v * 10) / 10;
    });

    const realIndexToday = real[real.length - 1]!;
    const dir = directionOf(realIndexToday);

    const good: Good = {
      id: s.id,
      label: s.label,
      pole: s.pole,
      hue: s.hue,
      baseYear: base,
      startYear,
      real,
      realIndexToday,
      directionFlag: dir.flag,
      direction: dir.word,
      tangible: s.tangible,
      footnote: s.footnote ?? null,
    };

    if (s.tangible) {
      const then = annual.get(base)!;
      const now = annual.get(latestYear)!;
      good.unit = s.unit;
      good.nominalThenYear = base;
      good.nominalNowYear = latestYear;
      good.nominalThen = fmtTangible(s.unit!, then);
      good.nominalNow = fmtTangible(s.unit!, now);
      good.keptPaceDollar = fmtTangible(s.unit!, then * inflBaseToLatest);
    }

    if (s.id === 'stamp') {
      // Teach runs on the stamp's own long base (1976 = 13¢), where real is flat.
      const TEACH_BASE = 1976;
      const teachYears: number[] = [];
      for (let y = TEACH_BASE; y <= latestYear; y++) teachYears.push(y);
      const cBase = stampAnnual.get(TEACH_BASE)!;
      const dBase = deflator.get(TEACH_BASE)!;
      good.teach = {
        baseYear: TEACH_BASE,
        years: teachYears,
        nominalCents: teachYears.map((y) => stampAnnual.get(y)!),
        tideCents: teachYears.map((y) => Math.round(cBase * (deflator.get(y)! / dBase) * 10) / 10),
        realCents: teachYears.map((y) => Math.round(stampAnnual.get(y)! * (dBase / deflator.get(y)!) * 10) / 10),
        thenCents: cBase,
        nowCents: stampAnnual.get(latestYear)!,
        realNowCents: Math.round(stampAnnual.get(latestYear)! * (dBase / deflator.get(latestYear)!) * 10) / 10,
      };
    }

    return good;
  });

  const data: SeriesData = {
    meta: {
      baseYear: GLOBAL_BASE,
      latestYear,
      years,
      deflatorLabel: DEFLATOR.label,
      sourceCredit:
        'U.S. Bureau of Labor Statistics (CPI item indexes and average prices); USPS rate history.',
      generated: new Date().toISOString().slice(0, 10),
    },
    goods,
  };

  const outDir = join(ROOT, 'src', 'data');
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'series.json'), JSON.stringify(data));

  // --- eyeball summary ---
  console.log(`\nbase ${GLOBAL_BASE}  latest ${latestYear}  (inflation base->latest x${inflBaseToLatest.toFixed(2)})`);
  console.log('good        pole   start  base  realToday  dir');
  for (const g of goods) {
    console.log(
      `${g.id.padEnd(11)} ${g.pole.padEnd(5)}  ${g.startYear}   ${g.baseYear}   ${String(g.realIndexToday).padStart(6)}    ${g.direction}` +
      (g.tangible ? `   [${g.nominalThen}->${g.nominalNow}, kept-pace ${g.keptPaceDollar}]` : ''),
    );
  }
  console.log(`\nwrote src/data/series.json (${years.length} years x ${goods.length} goods)`);
}

main().catch((e) => { console.error(e); process.exit(1); });

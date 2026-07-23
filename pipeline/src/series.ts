// Single source of truth for the source table (§3 of the build spec).
// download.ts fetches per this; build.ts computes real-price indexes per this.
//
// Fetch reality (verified at build): FRED CSV (node fetch + browser UA) serves the
// deflator + the two average-price (APU) goods + rent + airfare, but NOT the five
// CPI item indexes (TV, clothing, medical, college, childcare) — those 404 on FRED.
// BLS flat files (download.bls.gov) carry every CPI item series with an M13 annual
// average. So the pipeline is a hybrid: FRED for what FRED serves, BLS flat files
// for the item indexes.

export type Src = 'fred' | 'bls';

export interface SourceSpec {
  id: string;
  label: string;
  pole: 'up' | 'down';
  hue: string; // System B picker ramp
  src: Src;
  /** FRED series id, or BLS series id (with its group file) — the raw key. */
  seriesId: string;
  /** BLS group file the series lives in (bls only). */
  blsFile?: string;
  /** 'index' = CPI item index; 'price' = actual $/unit (APU). */
  type: 'index' | 'price';
  baseYear: number;
  tangible: boolean;
  unit?: string;
  footnote?: string;
}

// Deflator: CPI-U All Items, U.S. City Average, NSA. CUUR0000SA0 is not on FRED;
// CPIAUCNS is the identical series (same underlying BLS data, 1982-84=100).
export const DEFLATOR = {
  fredId: 'CPIAUCNS',
  label: 'CPI-U, All Items, U.S. City Average (NSA) — CUUR0000SA0, via FRED alias CPIAUCNS',
} as const;

// BLS group files (download.bls.gov/pub/time.series/cu/<file>)
export const BLS_BASE = 'https://download.bls.gov/pub/time.series/cu/';
export const FRED_BASE = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=';

// Rail / scroll-bucket order: goods pole (beat 4) first, services pole (beat 5) next.
export const SOURCES: SourceSpec[] = [
  // --- goods pole (cool blue ↓/held) ---
  {
    id: 'gas', label: 'Gas', pole: 'down', hue: 'oklch(0.62 0.14 40)',
    src: 'fred', seriesId: 'APU000074714', type: 'price', baseYear: 1980,
    tangible: true, unit: 'gallon of gas',
  },
  {
    id: 'tv', label: 'TV', pole: 'down', hue: 'oklch(0.62 0.13 80)',
    src: 'bls', seriesId: 'CUUR0000SERA01', blsFile: 'cu.data.16.USRecreation', type: 'index', baseYear: 1980,
    tangible: false,
    footnote: 'Constant-quality: a 2024 4K set measured against a 1960 console, not the same box getting cheaper.',
  },
  {
    id: 'clothing', label: 'Clothing', pole: 'down', hue: 'oklch(0.60 0.13 120)',
    src: 'bls', seriesId: 'CUUR0000SAA', blsFile: 'cu.data.13.USApparel', type: 'index', baseYear: 1980,
    tangible: false,
    footnote: 'Constant-quality apparel basket, not the shirt on the rack.',
  },
  {
    id: 'stamp', label: 'Stamp', pole: 'down', hue: 'oklch(0.60 0.11 160)',
    src: 'bls', seriesId: 'STAMP', type: 'price', baseYear: 1980, // STAMP handled specially (rate table)
    tangible: true, unit: 'first-class stamp',
  },
  {
    id: 'eggs', label: 'Eggs', pole: 'down', hue: 'oklch(0.62 0.13 200)',
    src: 'fred', seriesId: 'APU0000708111', type: 'price', baseYear: 1980,
    tangible: true, unit: 'dozen eggs',
  },
  // --- services pole (warm rose ↑) ---
  {
    id: 'college', label: 'College', pole: 'up', hue: 'oklch(0.60 0.13 250)',
    src: 'bls', seriesId: 'CUUR0000SEEB01', blsFile: 'cu.data.17.USEducationAndCommunication', type: 'index', baseYear: 1980,
    tangible: false,
  },
  {
    id: 'healthcare', label: 'Healthcare', pole: 'up', hue: 'oklch(0.58 0.15 290)',
    src: 'bls', seriesId: 'CUUR0000SAM', blsFile: 'cu.data.15.USMedical', type: 'index', baseYear: 1980,
    tangible: false,
  },
  {
    id: 'rent', label: 'Rent', pole: 'up', hue: 'oklch(0.60 0.15 330)',
    src: 'fred', seriesId: 'CUUR0000SEHA', type: 'index', baseYear: 1980,
    tangible: false,
    footnote: 'CPI rent of a primary residence — what people actually pay to keep a roof.',
  },
  {
    id: 'childcare', label: 'Childcare', pole: 'up', hue: 'oklch(0.58 0.16 10)',
    src: 'bls', seriesId: 'CUUR0000SEEB03', blsFile: 'cu.data.17.USEducationAndCommunication', type: 'index', baseYear: 1991,
    tangible: false,
    footnote: 'Day care and preschool. The BLS series begins in 1990, so it enters the chart ragged, near 1990.',
  },
];

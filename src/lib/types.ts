// The build's data contract. Written by pipeline/src/build.ts, imported by the
// Astro page (prerender) and the client scripts (picker). Every on-screen number
// traces to a field here — no invented magnitudes anywhere in the app.

export type Pole = 'up' | 'down'; // up = services (rose), down = goods (blue)
export type Direction = 'climbed' | 'held' | 'fell';

export interface Good {
  id: string;
  label: string; // bare noun for chips + line labels
  pole: Pole;
  /** System B categorical hue (OKLCH string) — used in picker chip + revealed line. */
  hue: string;
  baseYear: number; // rebased to 100 here (1980 for all except childcare = 1990)
  startYear: number; // first year with data (drives the ragged entry)
  /** Real-price index aligned to meta.years; null for years before startYear. */
  real: (number | null)[];
  /** real at latestYear. */
  realIndexToday: number;
  /** sign(realIndexToday - 100), with a +/-5pt dead-band mapped to 0. */
  directionFlag: -1 | 0 | 1;
  direction: Direction; // 'climbed' | 'held' | 'fell' — build-computed, never bucket-hardcoded
  tangible: boolean; // gas / eggs / stamp carry a real-$ callout
  footnote: string | null;

  // --- tangible goods only (gas / eggs / stamp) ---
  unit?: string; // "gallon" | "dozen" | "first-class stamp"
  nominalThen?: string; // formatted actual price at baseYear
  nominalNow?: string; // formatted actual price at latestYear
  nominalThenYear?: number;
  nominalNowYear?: number;
  /** baseYear price grown by general inflation to latestYear dollars. */
  keptPaceDollar?: string;

  // --- stamp only (beat-2 teach) ---
  /**
   * The stamp teach runs on the stamp's own long base (1976 = 13¢) where its real
   * price is genuinely flat — the honest "it barely moved" payoff. Its own year
   * range, independent of the fan's 1980 spine.
   */
  teach?: StampTeach;
}

export interface StampTeach {
  baseYear: number; // 1976
  years: number[];
  /** nominal price in cents (the USPS step-jumps). */
  nominalCents: number[];
  /** "inflation tide": baseYear cents grown by the deflator (what it would cost if it just tracked inflation). */
  tideCents: number[];
  /** deflated back to baseYear cents — lands dead-flat. */
  realCents: number[];
  thenCents: number; // 13
  nowCents: number; // latest
  realNowCents: number; // deflated latest ~ still near 13
}

export interface SeriesMeta {
  baseYear: number;
  latestYear: number;
  years: number[];
  deflatorLabel: string;
  sourceCredit: string;
  generated: string; // ISO date of the bake
}

export interface SeriesData {
  meta: SeriesMeta;
  goods: Good[]; // rail / scroll-bucket order: goods pole then services pole
}

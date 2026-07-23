// Pure chart geometry — no DOM, no deps. Shared by the Astro build (static SVG
// prerender), the client GSAP scrub, and the picker. Every line is recomputed from
// scale functions + a progress value; no tweened SVG attributes (honors the
// gsap-scrub-from-conflict guardrail by construction).

import type { Good } from './types.ts';

export interface Frame {
  W: number; H: number;
  padL: number; padR: number; padT: number; padB: number;
}

export const FAN_FRAME: Frame = { W: 1000, H: 560, padL: 54, padR: 138, padT: 40, padB: 46 };
// same vertical extent as FAN_FRAME so the beat-2 -> beat-3 crossfade does not jump
export const TEACH_FRAME: Frame = { W: 1000, H: 560, padL: 60, padR: 120, padT: 40, padB: 46 };

export const plotW = (f: Frame) => f.W - f.padL - f.padR;
export const plotH = (f: Frame) => f.H - f.padT - f.padB;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
/** remap a sub-window of progress to 0..1 */
export const win = (p: number, from: number, to: number) => clamp((p - from) / (to - from));

/** x pixel for a year on a linear time axis. */
export function xAtYear(year: number, minYear: number, maxYear: number, f: Frame): number {
  return f.padL + ((year - minYear) / (maxYear - minYear)) * plotW(f);
}
/** y pixel for a value on a linear value axis (0 at bottom of plot). */
export function yAtValue(v: number, minVal: number, maxVal: number, f: Frame): number {
  return f.padT + plotH(f) - ((v - minVal) / (maxVal - minVal)) * plotH(f);
}

/** pixel points -> SVG path string. */
export function linePath(pts: [number, number][]): string {
  if (!pts.length) return '';
  return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
}

/**
 * Fan line pixel points for one good. Value at each year is lerp(100 -> real, progress),
 * so progress=0 collapses every line onto the 100 anchor and progress=1 shows the truth.
 * Null years (before a good's start) are skipped -> ragged entry.
 */
export function fanPoints(
  real: (number | null)[],
  years: number[],
  yMin: number,
  yMax: number,
  f: Frame,
  progress = 1,
): [number, number][] {
  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const pts: [number, number][] = [];
  for (let i = 0; i < years.length; i++) {
    const rv = real[i];
    if (rv == null) continue;
    const v = lerp(100, rv, progress);
    pts.push([xAtYear(years[i], minYear, maxYear, f), yAtValue(v, yMin, yMax, f)]);
  }
  return pts;
}

/** The x where a good's line begins (its first non-null year) — anchor for ragged entries. */
export function startX(real: (number | null)[], years: number[], f: Frame): number {
  const i = real.findIndex((v) => v != null);
  const idx = i < 0 ? 0 : i;
  return xAtYear(years[idx], years[0], years[years.length - 1], f);
}

/**
 * Greedy 1-D label dodge. Given desired y positions (line tips) sorted by y, push
 * overlapping labels apart by at least minGap while keeping order. Returns adjusted ys
 * keyed the same as input. §4.5 right-gutter dodge; leader lines connect tip -> label.
 */
export function dodge(desired: { key: string; y: number }[], minGap: number, top: number, bottom: number): Map<string, number> {
  const sorted = [...desired].sort((a, b) => a.y - b.y);
  const out: { key: string; y: number }[] = [];
  for (const d of sorted) {
    let y = d.y;
    const prev = out[out.length - 1];
    if (prev && y - prev.y < minGap) y = prev.y + minGap;
    out.push({ key: d.key, y });
  }
  // if we ran past the bottom, shift the whole stack up
  const overflow = out.length ? out[out.length - 1].y - bottom : 0;
  if (overflow > 0) for (const o of out) o.y = Math.max(top, o.y - overflow);
  return new Map(out.map((o) => [o.key, o.y]));
}

/** Nice axis ticks for a linear domain [0, max]. */
export function axisTicks(max: number, step: number): number[] {
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-6; v += step) out.push(v);
  return out;
}

/**
 * Two-pole fan stroke per good: hue + chroma fixed per pole (System A — services
 * rose, goods blue), luminance varied within the pole so lines separate while the
 * two masses still read as masses. The extreme line in each pole gets the darkest
 * ink. Returns id -> oklch string. Used by both the static FanChart and the scrub.
 */
export function assignFanColors(goods: Good[]): Map<string, string> {
  const byPole = (p: 'up' | 'down') =>
    goods
      .filter((g) => g.pole === p)
      .sort((a, b) => (p === 'up' ? b.realIndexToday - a.realIndexToday : a.realIndexToday - b.realIndexToday));
  const m = new Map<string, string>();
  const put = (arr: Good[], L0: number, dL: number, C: number, H: number) => {
    arr.forEach((g, i) => {
      const t = arr.length > 1 ? i / (arr.length - 1) : 0;
      m.set(g.id, `oklch(${(L0 + t * dL).toFixed(3)} ${C} ${H})`);
    });
  };
  put(byPole('up'), 0.5, 0.12, 0.185, 18); // services — rose
  put(byPole('down'), 0.5, 0.14, 0.115, 240); // goods — blue
  return m;
}

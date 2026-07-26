// Shared 9-item model for the "after" variations. Ranked best real deal → worst (ascending
// real-2024 index). The drawing for each good lives in marks.ts and is referenced by id.
// Colour is diverging *within the top chart's own two poles* — goods/held run
// cool, services run warm — so the gallery speaks the same language as the drain-the-tide chart
// instead of inventing a nine-hue rainbow. Derived from series.json so every number traces to the
// same source as the top chart.
import seriesData from '../data/series.json';
import type { SeriesData } from './types.ts';

const data = seriesData as unknown as SeriesData;

const HEAD: Record<string, string> = {
  tv: 'Off the bottom', clothing: 'Quietly cheaper', gas: 'Cheaper than 1980',
  eggs: 'Right where it began', stamp: 'Your dollar shrank', rent: "Can't opt out",
  childcare: 'Climbs the fastest', healthcare: 'A steepening slope', college: 'Never stops climbing',
};
const BLURB: Record<string, string> = {
  tv: 'A television falls clean off the bottom. The same money buys vastly more TV — a 2024 4K set against a 1960 console.',
  clothing: 'Clothing gets quietly cheaper, decade after decade, on a constant-quality basket.',
  gas: 'Gas swings with every crisis and boom — but in real terms a gallon costs less than it did in 1980.',
  eggs: 'Eggs are the noisy one — bird-flu spikes and all — but land about where they began.',
  stamp: 'A first-class stamp barely moved in real terms. It never got pricier; your dollar got smaller.',
  rent: 'Rent is the one you can’t opt out of. It rises across the whole window — the price of a roof.',
  childcare: 'Childcare arrives late, around 1990, and climbs the fastest of anything here.',
  healthcare: 'Medical care never stops rising. Not a spike — a slope that steepens.',
  college: 'College tuition climbs, and keeps climbing — up about 248% in real terms since 1980.',
};

const ranked = [...data.goods].sort((a, b) => a.realIndexToday - b.realIndexToday);
const downs = ranked.filter((g) => g.pole === 'down');
const ups = ranked.filter((g) => g.pole === 'up');
const dev = (g: Good) => g.realIndexToday - 100;
// two normalisers, deliberately different:
//   mag  — per pole, so BOTH extremes (a TV at −100%, tuition at +248%) read as fully saturated
//   lift — across all nine, signed, so vertical position stays literally true to the 100 baseline
const maxOf = (gs: Good[]) => Math.max(...gs.map((g) => Math.abs(dev(g))));
const maxDown = maxOf(downs), maxUp = maxOf(ups), maxAll = Math.max(maxDown, maxUp);

export interface Item {
  id: string; label: string; head: string; blurb: string;
  idx: number; pct: number; real: (number | null)[]; pole: 'up' | 'down';
  hue: number; mag: number; lift: number;
  color: string; colorInk: string; rise: boolean;
}

export const ITEMS: Item[] = ranked.map((g) => {
  const cool = g.pole === 'down';
  const sameSide = cool ? downs : ups;
  const k = sameSide.indexOf(g) / (sameSide.length - 1);            // rank within its own pole
  const mag = Math.sqrt(Math.abs(dev(g)) / (cool ? maxDown : maxUp));
  // hues stay inside the top chart's two poles (blue 240, rose 18) — a nine-hue rainbow would
  // contradict the chart it hands off from
  const hue = cool ? 248 - 42 * k : 34 - 22 * k;                     // blue→teal · rust→crimson
  const h = hue.toFixed(1);
  const L = 0.645 - 0.135 * mag, C = 0.075 + 0.115 * mag;            // farther from 100 = deeper
  return {
    id: g.id, label: g.label, head: HEAD[g.id], blurb: BLURB[g.id],
    idx: g.realIndexToday, pct: Math.round(dev(g)), real: g.real, pole: g.pole,
    hue, mag,
    lift: Math.sign(dev(g)) * Math.sqrt(Math.abs(dev(g)) / maxAll),
    color: `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${h})`,            // large marks on paper (≥3:1)
    colorInk: `oklch(${(Math.min(L, 0.48) - 0.02 * mag).toFixed(3)} ${(C * 0.92).toFixed(3)} ${h})`,
    rise: dev(g) >= 0,
  };
});
export const YEARS: number[] = data.meta.years;
export const SOURCE = data.meta.sourceCredit;
export const DEFLATOR = data.meta.deflatorLabel;

// The top chart's own y-scale: real index 0→380, 100 = kept pace with inflation. HORIZON draws all
// nine trajectories on it so panning sideways reads as one panorama rather than nine rescaled
// thumbnails — the same axis the skyline uses, spread across nine screens.
export const AXIS_MAX = 380;
export function axisPath(real: (number | null)[], x0 = 400, x1 = 880) {
  const n = real.length;
  const X = (i: number) => x0 + (i / (n - 1)) * (x1 - x0);
  const Y = (v: number) => AXIS_MAX - Math.max(0, Math.min(AXIS_MAX, v));
  let d = '', started = false;
  real.forEach((v, i) => {
    if (v == null) return;
    d += (started ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1);
    started = true;
  });
  const last = real.map((v, i) => (v == null ? null : i)).filter((i) => i != null).pop() as number;
  const first = real.findIndex((v) => v != null);
  return {
    d, x0: X(first), x1: X(last), endX: X(last), endY: Y(real[last] as number),
    baseY: Y(100), startYear: 1980 + first,
    // fraction of the plot box the 2024 endpoint sits at — where its glass object goes
    endYFrac: Y(real[last] as number) / AXIS_MAX,
  };
}

// A small sparkline path for an item's real 1980→2024 series, framed tight to its own range
// with the 100 baseline marked. Shared by the WebGL HUD and the no-JS fallback so they match.
export function sparkPath(real: (number | null)[], W = 150, H = 46, pad = 5) {
  const vals = real.filter((v): v is number => v != null);
  let lo = Math.min(100, ...vals), hi = Math.max(100, ...vals);
  const pd = (hi - lo) * 0.12 || 8; lo -= pd; hi += pd;
  const n = real.length;
  const X = (i: number) => pad + (i / (n - 1)) * (W - 2 * pad);
  const Y = (v: number) => (H - pad) - ((v - lo) / (hi - lo)) * (H - 2 * pad);
  let d = ''; let started = false;
  real.forEach((v, i) => { if (v == null) return; d += (started ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); started = true; });
  const last = [...real].map((v, i) => (v == null ? null : i)).filter((i) => i != null).pop() as number;
  return { d, baseY: Y(100), W, H, endX: X(last), endY: Y(real[last] as number) };
}

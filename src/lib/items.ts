// Shared 9-item model for the "after" variations. Ranked best real deal → worst (ascending
// real-2024 index). Spectral-by-rank hue (cool = cheapest today, warm = priciest). Derived from
// series.json so every number traces to the same source as the top chart.
import seriesData from '../data/series.json';
import type { SeriesData } from './types.ts';

const data = seriesData as unknown as SeriesData;

const EMOJI: Record<string, string> = {
  tv: '📺', clothing: '👕', gas: '⛽', eggs: '🥚', stamp: '✉️',
  rent: '🏠', childcare: '🍼', healthcare: '🏥', college: '🎓',
};
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
const N = ranked.length;
export const hueFor = (i: number) => 240 - (i / (N - 1)) * 226; // 240 cool → 14 warm

// OKLCH → sRGB hex (WebGL/Canvas want a number; CSS keeps the oklch() string).
export function oklchToHex(L: number, C: number, Hdeg: number): number {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const enc = (c: number) => {
    c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(c * 255)));
  };
  return (enc(r) << 16) | (enc(g) << 8) | enc(bl);
}

export interface Item {
  id: string; label: string; emoji: string; head: string; blurb: string;
  idx: number; pct: number; real: (number | null)[]; hue: number;
  color: string; colorDim: string; rgb: number; rise: boolean;
}

export const ITEMS: Item[] = ranked.map((g, i) => {
  const h = hueFor(i);
  return {
    id: g.id, label: g.label, emoji: EMOJI[g.id], head: HEAD[g.id], blurb: BLURB[g.id],
    idx: g.realIndexToday, pct: Math.round(g.realIndexToday - 100), real: g.real, hue: h,
    color: `oklch(0.72 0.18 ${h.toFixed(1)})`,
    colorDim: `oklch(0.5 0.12 ${h.toFixed(1)})`,
    rgb: oklchToHex(0.72, 0.18, h),
    rise: g.realIndexToday >= 100,
  };
});
export const YEARS: number[] = data.meta.years;
export const SOURCE = data.meta.sourceCredit;
export const DEFLATOR = data.meta.deflatorLabel;

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

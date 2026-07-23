# The Real Price of Everything

A personal scrollytelling data-piece for [dustincoledata.com](https://dustincoledata.com).
Strip out inflation and everyday prices split: some goods got cheaper or held (TV,
clothing, gas, a stamp, eggs) while essential services exploded (college, healthcare,
rent, childcare). Scroll to watch nine things diverge on one real-price axis, then pick
a line and guess where it lands today.

Astro static · hand-authored SVG · GSAP ScrollTrigger · zero runtime compute.
Deployed standalone at `realprice.dustincoledata.com`.

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # -> dist/  (hermetic: uses committed src/data, no fetch)
```

## Data (run occasionally, then commit — no cron)

The real-price series are computed locally and **committed** to `src/data/`, so the
Vercel build never fetches anything.

```bash
npm run data       # fetch FRED CSV + BLS flat files -> compute -> src/data/series.json
npm run fonts      # re-subset self-hosted woff2 (Libre Franklin + Spline Sans Mono)
npm run og         # regenerate public/og/cover.png (resvg, browser-free)
```

- **Deflator:** CPI-U All Items, U.S. City Average, NSA (`CUUR0000SA0`, via FRED alias `CPIAUCNS`).
- **Sources:** BLS CPI item indexes + average prices (public domain); USPS rate history.
- **Model:** each item's CPI (or average price) ÷ all-items CPI-U, rebased to 100 at 1980
  (childcare at 1991, its first full year). Direction (`held`/`climbed`/`fell`) is
  computed from each good's real endpoint.

## Structure

```
pipeline/src/   local fetch + compute (node --experimental-strip-types)
src/data/       committed computed series (the build's data contract)
src/lib/        chart geometry + types (shared: build, scroll, picker, OG)
src/scripts/    client GSAP scroll + interactive picker
src/components/ FanChart.astro (static prerender = no-JS / reduced-motion fallback)
scripts/og.ts   browser-free OG cover generator
```

Source: U.S. Bureau of Labor Statistics (CPI item indexes and average prices); USPS rate history.

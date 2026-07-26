// ===== The specimen plates =================================================================
// Nine hand-inked field-guide drawings, one per good — the thing a "specimen hall" was always
// asking for and never had. They replace the raw system emoji, which (a) said the wrong word
// (an envelope is not a stamp), (b) rendered as a different picture on every OS, and (c) went
// soft at hero size because a 20px glyph blown up 16× is a sticker, not a drawing.
//
// Drawn the way a naturalist's plate is drawn: one continuous contour with a pen that wobbles
// and overshoots, hatching for shade, and a flat wash of the item's own hue underneath. Every
// coordinate is authored off-grid on purpose — perfect rects and true circles read as clip-art.
//
// One geometry serves every size. The three layers are switched by inherited custom properties,
// which is the only styling that survives a <use> shadow tree:
//   --sw     contour weight        --hw     hatch weight
//   --hatch  hatch opacity (0 hides it — the top chart is 30px, hatching there is mud)
//   --wash   wash opacity
// Colour comes from `color` on the <use>, via currentColor.

export interface Plate {
  wash: string[];   // closed silhouettes, filled, no stroke
  ink: string[];    // the contour
  hatch: string[];  // shading — dropped at small sizes
}

/* A postage stamp's perforated edge, built rather than typed: cubic bumps instead of arcs so the
   tooth shape is exact at any count. nx/ny teeth per axis, each bump a half-round of radius r. */
function perforated(x0: number, y0: number, r: number, nx: number, ny: number): string {
  const k = 0.55 * r, j = 1.33 * r, s = r + k, d = 2 * r;   // cubic half-round, one tooth
  const bump = (...n: number[]) => ` c${n.join(' ')}`;
  return `M${x0} ${y0}` +
    bump(k, -j, s, -j, d, 0).repeat(nx) +      // top edge, teeth pointing up
    bump(j, k, j, s, 0, d).repeat(ny) +        // right edge, teeth pointing right
    bump(-k, j, -s, j, -d, 0).repeat(nx) +     // bottom edge
    bump(-j, -k, -j, -s, 0, -d).repeat(ny) +   // left edge
    'Z';
}
const STAMP_EDGE = perforated(24, 20, 6, 6, 7);   // 72 × 84, centred in the 120 box

export const PLATES: Record<string, Plate> = {
  /* --- a cabinet television: the one thing on the page that got radically better and cheaper --- */
  tv: {
    wash: ['M22 50C20 48 20.5 46.8 23.4 46.4L98 45C101 45 102.2 46.2 101.7 49L103 98.4C103.2 101.4 101 102.6 98 102.2L22.2 103.6C19 103.8 17.9 101.9 18.4 99Z'],
    ink: [
      'M22 50C20 48 20.5 46.8 23.4 46.4L98 45C101 45 102.2 46.2 101.7 49L103 98.4C103.2 101.4 101 102.6 98 102.2L22.2 103.6C19 103.8 17.9 101.9 18.4 99Z',
      'M31.4 58.6C30.2 56.6 31.3 55.4 33.6 55.3L75.8 54.2C78.2 54.1 79 55.2 78.9 57.2L79.9 89.8C80 92 78.6 92.9 76.2 93L32.4 94.2C30.1 94.3 29.2 93 29.3 90.9Z',
      'M91.2 65.4C93.9 65.3 95.6 67 95.5 69.4C95.4 71.8 93.7 73.4 91.1 73.5C88.4 73.6 86.8 71.9 86.9 69.6C87 67.2 88.6 65.5 91.2 65.4Z',
      'M91.6 82.2C94 82.1 95.5 83.6 95.4 85.7C95.3 87.9 93.8 89.3 91.4 89.4C89 89.5 87.6 88 87.7 85.9C87.8 83.8 89.3 82.3 91.6 82.2Z',
      'M56.4 46.2 36.6 16.4', 'M64.2 45.9 88.4 12.8',
      'M31.6 104.2 27.4 114.6', 'M89.8 102.8 94.6 113',
    ],
    hatch: ['M34.6 85.4 61 58.4', 'M41.8 90.8 74.2 57.6', 'M52.4 92.6 78.4 66.2', 'M64.8 93.4 78.8 79'],
  },

  /* --- a t-shirt on the line: the quiet, constant-quality bargain --- */
  clothing: {
    wash: ['M40.4 29.6 26 40.2C21.8 43.4 21.2 45.4 23.4 48.4L33.2 62.4C34.6 64.4 36.2 64 37.4 62.2L42.2 55.2 41.4 100.6C41.3 103.6 42.6 104.8 45.4 104.4L76.4 103.6C79.2 103.5 80.2 102.2 79.6 99.4L78.2 54 84.4 62.2C85.7 63.9 87.3 63.8 88.6 61.8L97.4 47C99.4 43.8 98.6 41.8 94.6 39.4L80.2 29.4C72.2 36.6 65 40.2 60 40.3C55 40.4 47.6 37 40.4 29.6Z'],
    ink: [
      'M40.4 29.6 26 40.2C21.8 43.4 21.2 45.4 23.4 48.4L33.2 62.4C34.6 64.4 36.2 64 37.4 62.2L42.2 55.2 41.4 100.6C41.3 103.6 42.6 104.8 45.4 104.4L76.4 103.6C79.2 103.5 80.2 102.2 79.6 99.4L78.2 54 84.4 62.2C85.7 63.9 87.3 63.8 88.6 61.8L97.4 47C99.4 43.8 98.6 41.8 94.6 39.4L80.2 29.4',
      'M40.4 29.6C47.6 37 55 40.4 60 40.3C65 40.2 72.2 36.6 80.2 29.4',
      'M44.6 33.6C50.4 39.4 55.4 42 60 42.4', 'M76.2 33C71 38.6 66 41.6 61.6 42.4',
    ],
    hatch: ['M50.6 68.4 51.8 98.2', 'M61.4 66.8 62.2 99.4', 'M71.4 71.2 70.6 96.4', 'M46 78 46.6 96'],
  },

  /* --- a kerbside pump: the price that swings with every crisis and still lands below 1980 --- */
  gas: {
    wash: ['M29.6 36.4C29.4 31.2 32 28.6 36.8 28.4L66.2 27.4C71 27.2 73.4 29.6 73.6 34.8L75 102.4C75.2 106 73 107.8 69.2 108L34 109C30.2 109.2 28.4 107.4 28.4 103.8Z'],
    ink: [
      'M29.6 36.4C29.4 31.2 32 28.6 36.8 28.4L66.2 27.4C71 27.2 73.4 29.6 73.6 34.8L75 102.4C75.2 106 73 107.8 69.2 108L34 109C30.2 109.2 28.4 107.4 28.4 103.8Z',
      'M37.8 41C36.6 39.2 37.8 38.2 40.2 38L62.8 37.2C65.2 37.1 66 38 66.2 39.8L66.8 56.4C66.9 58.4 65.8 59.2 63.4 59.4L40 60C37.6 60.1 36.8 59 36.8 57.2Z',
      'M75 46.8C85.6 45.8 92 51.6 92.4 61.6L92.8 83.4',
      'M87.6 83C87.4 80.8 88.6 79.6 90.8 79.6L96 79.4C98.2 79.4 99.4 80.6 99.4 82.8L99.6 96.6C99.6 100 97.6 101.8 94.2 101.6L92.4 101.4C89.4 101.2 87.8 99.4 87.8 96.4Z',
      'M88.2 88.6 78.6 93.4',          /* the spout, angled down — a level one reads as a cable */
      'M38.6 72.4 58.4 71.6', 'M25.4 110 80 108.6',
    ],
    hatch: ['M41 48.8 52 40.6', 'M45 55.2 61.4 42.4', 'M53.6 57.2 65 48.6', 'M40 84 62 83.2', 'M40 92 58 91.4'],
  },

  /* --- two eggs, plate style: the noisy one that lands where it began --- */
  eggs: {
    wash: [
      'M64.4 22.6C77.8 23.2 89.2 41.4 88.4 60.6C87.6 79.8 76.6 91.6 63.6 91C50.6 90.4 40.2 77.8 41 59.2C41.8 40.6 51 22 64.4 22.6Z',
      'M29.8 55.2C37.6 55.6 43.6 65 43 76.2C42.4 87.4 36.2 94.4 28.8 94C21.4 93.6 16.6 86.4 17.2 75.2C17.8 64 22 54.8 29.8 55.2Z',
    ],
    ink: [
      'M64.4 22.6C77.8 23.2 89.2 41.4 88.4 60.6C87.6 79.8 76.6 91.6 63.6 91C50.6 90.4 40.2 77.8 41 59.2C41.8 40.6 51 22 64.4 22.6Z',
      'M29.8 55.2C37.6 55.6 43.6 65 43 76.2C42.4 87.4 36.2 94.4 28.8 94C21.4 93.6 16.6 86.4 17.2 75.2C17.8 64 22 54.8 29.8 55.2Z',
    ],
    hatch: [
      'M52.6 82.4C63 80.6 72.6 72.4 78 61', 'M60.4 87.6C70.6 83.8 79.4 75.4 83 64.4',
      'M70.4 88.4C78.4 83.4 84.4 75.6 86.8 68', 'M25.4 89.4C32.4 87 37.6 80.4 39.6 72.4',
    ],
  },

  /* --- an actual perforated stamp. The old envelope glyph said "mail"; this says "postage". --- */
  stamp: {
    wash: [STAMP_EDGE],
    ink: [
      STAMP_EDGE,
      'M35.4 32.6C34.4 31 35.4 30 37.6 29.9L83.4 28.6C85.6 28.5 86.6 29.4 86.6 31.4L87.8 92.6C87.9 94.8 86.8 95.8 84.6 95.9L37 97.2C34.8 97.3 33.8 96.2 33.8 94.2Z',
    ],
    hatch: [
      'M78.4 42.6C84.6 42.4 89.4 46.8 89.6 52.8C89.8 58.8 85.2 63.4 79 63.6C72.8 63.8 68 59.4 67.8 53.4C67.6 47.4 72.2 42.8 78.4 42.6Z',
      'M40.6 47.4C45.4 44.6 50.2 50.4 55 47.6', 'M40.8 55C45.6 52.2 50.4 58 55.2 55.2',
      'M41 62.6C45.8 59.8 50.6 65.6 55.4 62.8',
      'M41.6 78.4 82 77.2', 'M41.8 86 74 85',
    ],
  },

  /* --- a roof you cannot opt out of --- */
  rent: {
    wash: ['M30.4 57.4 60 30 89.8 56.6 90.4 104.4 30 105.6Z'],
    ink: [
      'M19.4 62.6 60 25.4 100.8 61.4', 'M30.4 57.4 31 105.4', 'M89.6 56.8 90.4 104.2',
      'M24.4 106.4 96.6 104.8',
      'M51.6 105 51.4 82.6C51.4 76.8 55 73.4 60.4 73.4C65.8 73.4 69.2 76.8 69.2 82.6L69.4 104.4',
      'M37.4 67.4 47.6 66.9 48 79.4 37.8 80Z', 'M73.4 66 83.6 65.6 84 78 73.8 78.6Z',
      'M77.4 42.4 77.2 27.4 85.6 27.2 86 49.2',
    ],
    /* the roof hatch has to stay under the slope — a stroke that pokes out past the eave reads as
       a mistake rather than shading, and at this scale a 2px escape is very visible */
    hatch: ['M35.4 55.4 55.6 36.8', 'M45.2 57 66.4 37.4', 'M56 57.6 75.4 41.6', 'M67.4 57.4 84.2 49.4'],
  },

  /* --- the bottle: arrives late, then climbs the fastest of anything here --- */
  childcare: {
    wash: ['M47.6 38.4C40 42.6 37.6 50.4 37.8 60.4L38.4 100.4C38.5 105.4 41 107.6 46.4 107.4L74.2 106.8C79.4 106.7 81.8 104.4 81.6 99.4L82 60C82.2 50 79.8 42.2 72.4 38.2Z'],
    ink: [
      'M52.4 14.6C52.2 8.4 68.4 8 68.6 14.4C68.8 20.4 66.6 24.4 66.6 28.4L54.2 28.6C54 24.6 52.6 20.6 52.4 14.6Z',
      'M47.4 28.8 72.6 28.2 73 38.6 47.6 39.2Z',
      'M47.6 38.4C40 42.6 37.6 50.4 37.8 60.4L38.4 100.4C38.5 105.4 41 107.6 46.4 107.4L74.2 106.8C79.4 106.7 81.8 104.4 81.6 99.4L82 60C82.2 50 79.8 42.2 72.4 38.2',
    ],
    hatch: ['M44.4 60.6 55.6 60.2', 'M44.6 71 51.8 70.8', 'M44.8 81.4 56 81', 'M45 91.6 52 91.4'],
  },

  /* --- the stethoscope: a slope that never stops steepening.
         Drawn off-axis on purpose: a symmetric V with a disc hanging dead centre reads as a
         pendant, not an instrument. The chest piece swings to one side and the tubes hook at the
         ear the way a real one does. --- */
  healthcare: {
    wash: ['M79.6 79.4C88 79.8 94.4 87 94 95.4C93.6 103.8 86.4 110 78 109.6C69.6 109.2 63.4 102 63.8 93.6C64.2 85.2 71.2 79 79.6 79.4Z'],
    ink: [
      'M36.2 12.8C30 12 26.6 15.4 27.6 20.6C24 36 27 52 38 60C43 63.6 48 65 51.6 65.4',
      'M68.8 10.8C75 9.6 78.8 12.8 78.2 18C81.6 33 78.4 51 68 59C63 62.6 57 64.6 51.6 65.4',
      'M51.6 65.4C55 74.4 62.4 81 71.6 84.4',
      'M79.6 79.4C88 79.8 94.4 87 94 95.4C93.6 103.8 86.4 110 78 109.6C69.6 109.2 63.4 102 63.8 93.6C64.2 85.2 71.2 79 79.6 79.4Z',
      'M79.2 86.6C83.8 86.8 87.2 90.6 87 95.2C86.8 99.8 83 103.2 78.4 103C73.8 102.8 70.4 99 70.6 94.4C70.8 89.8 74.6 86.4 79.2 86.6Z',
    ],
    hatch: ['M33.4 32.4 40.6 30.4', 'M32.6 44.4 41.4 42', 'M36.6 54 45.4 50.6', 'M74.6 32 67.4 29.6', 'M75 44 66.6 41.8'],
  },

  /* --- the cap: climbs, and keeps climbing --- */
  college: {
    wash: ['M60.4 24.4 109.6 45.6 60 66.8 10.4 45.4Z'],
    ink: [
      'M60.4 24.4 109.6 45.6 60 66.8 10.4 45.4Z',
      'M37.6 54.4 38.2 77.4C38.3 87.6 82.4 87 82.4 76.8L82.2 53.6',
      'M105.4 47.4 105.8 72.4C105.9 76.4 101.4 76.6 101.6 80.6',
      'M101.6 80.4C104.6 80.3 106.6 82.4 106.6 85.4C106.6 89.4 104 91.4 101.4 91.4C98.4 91.4 96.4 89 96.4 85.6C96.4 82.6 98.6 80.5 101.6 80.4Z',
    ],
    hatch: ['M45.4 66.4 46.4 82.4', 'M56.4 70.4 56.8 85.4', 'M67.4 70 67 85', 'M77.4 66 77.6 81.4'],
  },
};

/* One <symbol> per plate, defined once per page; every chart, hall specimen and gallery card is a
   <use> of it. Layer weights and opacities come in as inherited custom properties, so the same
   geometry serves a 30px chart glyph and a 320px hero without a second drawing. */
export function symbolMarkup(id: string, p: Plate): string {
  const path = (d: string) => `<path d="${d}"/>`;
  return (
    `<symbol id="mk-${id}" viewBox="0 0 120 120">` +
    `<g style="fill:currentColor;fill-opacity:var(--wash,0.1);stroke:none">${p.wash.map(path).join('')}</g>` +
    `<g style="fill:none;stroke:currentColor;stroke-width:var(--sw,1.5);stroke-linecap:round;stroke-linejoin:round">${p.ink.map(path).join('')}</g>` +
    `<g style="fill:none;stroke:currentColor;stroke-width:var(--hw,0.9);stroke-linecap:round;stroke-opacity:var(--hatch,0.42)">${p.hatch.map(path).join('')}</g>` +
    `</symbol>`
  );
}

export const MARK_DEFS = Object.entries(PLATES).map(([id, p]) => symbolMarkup(id, p)).join('');

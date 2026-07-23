// Fetch each series' raw data once, cache under pipeline/raw/ (gitignored), skip
// re-download if the cache is present (Namesake download.ts pattern). Run locally;
// the computed output is committed so Vercel never fetches anything.

import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES, DEFLATOR, FRED_BASE, BLS_BASE } from './series.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAW = join(ROOT, 'pipeline', 'raw');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

async function cachedFetch(url: string, cachePath: string): Promise<string> {
  if (await exists(cachePath)) {
    return readFile(cachePath, 'utf8');
  }
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`fetch failed ${res.status} for ${url}`);
  const text = await res.text();
  if (text.length < 200 || text.includes('<!DOCTYPE html>')) {
    throw new Error(`fetch returned non-data (likely blocked/404) for ${url}`);
  }
  await writeFile(cachePath, text);
  return text;
}

export interface RawCache {
  fred: Map<string, string>; // seriesId -> CSV text
  bls: Map<string, string>; // blsFile -> tab-delimited text
}

export async function downloadAll(): Promise<RawCache> {
  await mkdir(RAW, { recursive: true });
  const fred = new Map<string, string>();
  const bls = new Map<string, string>();

  // deflator (FRED)
  fred.set(
    DEFLATOR.fredId,
    await cachedFetch(FRED_BASE + DEFLATOR.fredId, join(RAW, `fred-${DEFLATOR.fredId}.csv`)),
  );

  // unique FRED series + unique BLS group files
  const fredIds = new Set<string>();
  const blsFiles = new Set<string>();
  for (const s of SOURCES) {
    if (s.seriesId === 'STAMP') continue; // hand-entered rate table
    if (s.src === 'fred') fredIds.add(s.seriesId);
    else if (s.blsFile) blsFiles.add(s.blsFile);
  }

  for (const id of fredIds) {
    process.stdout.write(`FRED  ${id} ... `);
    fred.set(id, await cachedFetch(FRED_BASE + id, join(RAW, `fred-${id}.csv`)));
    console.log('ok');
  }
  for (const f of blsFiles) {
    process.stdout.write(`BLS   ${f} ... `);
    bls.set(f, await cachedFetch(BLS_BASE + f, join(RAW, `bls-${f}.txt`)));
    console.log('ok');
  }

  return { fred, bls };
}

import { defineConfig } from 'astro/config';

// Fully static, no adapter, zero framework integrations (Namesake pattern).
// Interactivity is plain client-side TS <script> modules bundled by Vite.
export default defineConfig({
  site: 'https://realprice.dustincoledata.com',
  base: '/',
  output: 'static',
  trailingSlash: 'ignore',
});

// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    // Sharp only at build time (Workers runtime can't load native binaries).
    imageService: 'compile',
  }),
  // We use plain <img> tags, no Astro Image component → keep things simple.
  image: { service: { entrypoint: 'astro/assets/services/noop' } },
  vite: { plugins: [tailwindcss()] },
});

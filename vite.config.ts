import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths: works on GitHub Pages subfolders and itch.io
  build: { assetsInlineLimit: 0, chunkSizeWarningLimit: 2000 },
  server: { host: '0.0.0.0', port: 3000, allowedHosts: true },
  define: {
    // Build version, shown small on the Title screen (SPEC §12). npm sets this for every npm script.
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0-dev'),
  },
});

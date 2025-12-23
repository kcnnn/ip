import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './zkpassport-map.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});


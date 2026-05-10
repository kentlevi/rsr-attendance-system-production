import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: process.cwd(),
  envDir: process.cwd(),
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    fs: { strict: false }
  }
});

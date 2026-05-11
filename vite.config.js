import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { VitePWA } from 'vite-plugin-pwa';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: repoRoot,
  envDir: repoRoot,
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'models/*'],
      manifest: {
        name: 'RSR Attendance System',
        short_name: 'RSR Attendance',
        description: 'RSR Engineering Attendance and Facial Recognition',
        theme_color: '#ffffff'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,bin}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // 10MB to accommodate heavy ML models
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase')) return 'vendor-firebase';
          if (id.includes('@vladmandic') || id.includes('face-api')) return 'vendor-face';
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) return 'vendor-pdf';
          if (id.includes('framer-motion') || id.includes('motion')) return 'vendor-motion';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) return 'vendor-react';
          return undefined;
        },
      },
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true'
  }
});

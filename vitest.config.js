import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: repoRoot,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: [path.join(repoRoot, 'src/setupTests.ts')],
    globals: true,
    include: ['src/__tests__/**/*.test.{ts,tsx}', 'src/lib/AttendanceApprovalRules.test.ts']
  },
});

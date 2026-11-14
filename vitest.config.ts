import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/atrium/__tests__/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@/atrium': path.resolve(__dirname, './src/atrium'),
      '@': path.resolve(__dirname, '.'),
    },
  },
});

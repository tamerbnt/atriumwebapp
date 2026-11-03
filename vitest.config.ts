import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/atrium/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@/atrium': path.resolve(__dirname, './src/atrium'),
      '@': path.resolve(__dirname, '.'),
    },
  },
});

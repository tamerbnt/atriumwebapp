import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/atrium/__tests__/**/*.test.{ts,tsx}',
      'src/atrium/components/EmptyState/EmptyState.test.tsx',
      'src/lib/supabase/__tests__/**/*.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@/atrium': path.resolve(__dirname, './src/atrium'),
      '@': path.resolve(__dirname, '.'),
    },
  },
});

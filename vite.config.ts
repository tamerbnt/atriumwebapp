import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@/atrium': path.resolve(__dirname, './src/atrium'),
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('@supabase') || id.includes('supabase')) {
                return 'vendor-supabase';
              }
              return 'vendor-libs';
            }
            if (id.includes('/src/lib/supabase/')) {
              return 'vendor-supabase';
            }
            if (id.includes('/src/components/ui/')) {
              return 'ui-components';
            }
            if (id.includes('/src/utils/')) {
              return 'app-utils';
            }
            // Category screens grouping
            const screenMatch = id.match(/\/src\/components\/screens\/([a-z0-9_]+)\//);
            if (screenMatch) {
              return `category-${screenMatch[1]}`;
            }
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      cors: true,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

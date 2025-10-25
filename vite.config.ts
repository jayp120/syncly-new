import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    return {
      server: {
        host: '0.0.0.0',
        port: 5000,
        hmr: {
          clientPort: 443,
          host: process.env.REPLIT_DEV_DOMAIN || 'localhost'
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY)
      },
      envPrefix: ['VITE_', 'GEMINI_'],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: mode !== 'production',
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: mode === 'production',
            drop_debugger: mode === 'production'
          }
        },
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom', 'react-router-dom'],
              'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
              'ui-vendor': ['lucide-react', 'recharts'],
              'utils': ['jspdf', 'jspdf-autotable', 'xlsx']
            }
          }
        },
        chunkSizeWarningLimit: 1000
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore']
      }
    };
});

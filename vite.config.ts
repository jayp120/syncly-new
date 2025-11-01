import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    const replitDomain = process.env.REPLIT_DEV_DOMAIN;
    const devPort = Number(process.env.PORT) || 5173;

    return {
      server: {
        host: '0.0.0.0',
        port: devPort,
        hmr: {
          clientPort: replitDomain ? 443 : devPort,
          host: replitDomain || 'localhost'
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

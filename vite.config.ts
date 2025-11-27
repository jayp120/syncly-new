import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const replitDomain = env.REPLIT_DEV_DOMAIN;
    const devPort = Number(env.PORT) || 5173;

    return {
      server: {
        host: '0.0.0.0',
        port: devPort,
        hmr: {
          clientPort: replitDomain ? 443 : devPort,
          host: replitDomain || 'localhost'
        }
      },
      // Only expose Vite-prefixed env vars to the client bundle; never leak server secrets like GEMINI_API_KEY.
      define: {},
      envPrefix: ['VITE_'],
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

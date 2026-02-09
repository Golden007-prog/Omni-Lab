import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function geminiSessionPlugin(apiKey: string): Plugin {
  return {
    name: 'gemini-session-api',
    configureServer(server) {
      server.middlewares.use('/api/realtime-session', (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing GEMINI_API_KEY / VITE_GEMINI_API_KEY in .env.local' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ apiKey }));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';
    return {
      // Base path for GitHub Pages (repo name)
      base: '/Omni-Lab/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        geminiSessionPlugin(geminiKey),
        react(),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(geminiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

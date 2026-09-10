import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const rewriteLocalApiForDemo = () => ({
  name: 'voiceshield-demo-api-rewrite',
  generateBundle(_: unknown, bundle: Record<string, any>) {
    for (const item of Object.values(bundle)) {
      if (item.type === 'chunk' && typeof item.code === 'string') {
        item.code = item.code
          .replaceAll('http://127.0.0.1:8000/predict', '/api/predict')
          .replaceAll('AudioCNN', 'VoiceShield Demo Engine')
          .replaceAll('trained model', 'demo engine')
          .replaceAll('trained classifier', 'demo classifier')
          .replaceAll('API LATENCY: 42ms', 'DEMO MODE: ON');
      }
    }
  },
});

export default defineConfig(() => ({
  plugins: [react(), tailwindcss(), rewriteLocalApiForDemo()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));

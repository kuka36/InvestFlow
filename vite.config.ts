import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // 天天基金API代理
          '/api/ttfund': {
            target: 'https://fundgz.1234567.com.cn',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/ttfund/, '')
          },
          // ExchangeRate API代理
          '/api/exchangerate': {
            target: 'https://api.exchangerate-api.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/exchangerate/, '')
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

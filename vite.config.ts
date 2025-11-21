import path from 'path';
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/InvestFlow/', // Critical for GitHub Pages hosting
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
        // Safely stringify env vars, fallback to empty string if undefined
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.VITE_ALPHA_VANTAGE_KEY': JSON.stringify(env.VITE_ALPHA_VANTAGE_KEY || '')
    },
    resolve: {
      alias: {
        // Use process.cwd() instead of __dirname for ESM compatibility
        '@': path.resolve(process.cwd(), '.'),
      }
    }
  }
})
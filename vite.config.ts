import path from 'path';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/PanassetLite/', // Critical for GitHub Pages hosting
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      // Use process.cwd() instead of __dirname for ESM compatibility
      '@': path.resolve((process as any).cwd(), '.'),
    }
  }
})
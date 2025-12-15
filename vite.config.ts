import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'src'),
      '@/lib': resolve(process.cwd(), 'src/lib')
    }
  },
  root: process.cwd(),
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: resolve(process.cwd(), 'index.html')
    }
  },
  server: {
    port: 3000,
    host: true
  },
  preview: {
    port: 3000,
    host: true
  }
});
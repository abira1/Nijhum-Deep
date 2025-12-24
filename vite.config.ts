import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        sw: './public/sw.js'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js';
        }
      }
    }
  },
  publicDir: 'public',
  server: {
    port: 3000,
    open: true
  },
  preview: {
    port: 3000
  }
})

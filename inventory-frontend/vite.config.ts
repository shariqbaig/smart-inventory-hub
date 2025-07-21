import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for static deployment
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Optimize bundle splitting for better caching
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'charts': ['recharts'],
          'excel': ['xlsx']
        }
      }
    },
    // Ensure compatibility with older browsers
    target: 'es2015',
    // Optimize for production
    minify: 'terser',
    sourcemap: true
  },
  // Configure dev server
  server: {
    port: 5173,
    host: true // Allow external access
  },
  // Preview server config (for npm run preview)
  preview: {
    port: 5173,
    host: true
  }
})

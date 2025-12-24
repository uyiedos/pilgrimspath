
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // We use (process as any).cwd() to avoid TS errors in some environments
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Prioritize VITE_GEMINI_API_KEY, fallback to others
  const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || env.API_KEY;

  return {
    plugins: [react()],
    base: './', // CRITICAL: Ensures assets load correctly in Capacitor (file:// protocol)
    build: {
      outDir: 'dist',
    },
    define: {
      // This allows the app to read process.env.API_KEY in the browser
      'process.env.API_KEY': JSON.stringify(apiKey),
    }
  }
})

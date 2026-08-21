import { defineConfig } from 'vite'
import path from 'path'
import { config } from 'dotenv'

// Load .env so process.env values are available for define substitution
const env = config({ path: path.resolve(__dirname, '.env') }).parsed ?? {}

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'src/shared') },
  },
  define: {
    'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID ?? ''),
    'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(env.GOOGLE_CLIENT_SECRET ?? ''),
    'process.env.INFOMANIAK_CLIENT_ID': JSON.stringify(env.INFOMANIAK_CLIENT_ID ?? ''),
    'process.env.INFOMANIAK_CLIENT_SECRET': JSON.stringify(env.INFOMANIAK_CLIENT_SECRET ?? ''),
  },
  build: {
    rollupOptions: {
      external: ['electron'],
    },
  },
})

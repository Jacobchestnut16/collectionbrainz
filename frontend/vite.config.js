import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, // already needed for Docker
    allowedHosts: ["frontend", "localhost"],
  },
  plugins: [react()],
})



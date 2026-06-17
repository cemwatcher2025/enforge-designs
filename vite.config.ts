import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.CUSTOM_DOMAIN === 'true' ? '/' : process.env.GITHUB_PAGES === 'true' ? '/enforge-designs/' : '/',
  plugins: [react()],
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwUknVw-RgbiaN71HaRqf_lAhj95A6MvNZ5ms1Hyd_CQobhfsgArtqODO75Txw80DjY/exec";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5179,
    host: "localhost",
    proxy: {
      "/drive-proxy": {
        target: APPS_SCRIPT_URL,
        changeOrigin: true,
        rewrite: () => "",
        followRedirects: true,
      },
    },
  },
})

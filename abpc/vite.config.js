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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("firebase")) return "firebase";
          if (id.includes("jspdf")) return "jspdf";
          if (id.includes("html2canvas")) return "html2canvas";
          if (id.includes("xlsx") || id.includes("file-saver")) return "sheet-export";
          if (id.includes("gsap") || id.includes("@gsap")) return "motion";
          if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) return "react-vendor";
        },
      },
    },
  },
  server: {
    port: 5179,
    host: "localhost",
    proxy: {
      "/drive-proxy": {
        target: APPS_SCRIPT_URL,
        changeOrigin: true,
        rewrite: () => "",
        followRedirects: true,
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            proxyRes.headers["access-control-allow-private-network"] = "true";
          });
        },
      },
    },
  },
})

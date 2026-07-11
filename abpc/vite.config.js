import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwUknVw-RgbiaN71HaRqf_lAhj95A6MvNZ5ms1Hyd_CQobhfsgArtqODO75Txw80DjY/exec";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Babel fast-refresh only — no unnecessary Babel transforms in prod
      babel: { babelrc: false, configFile: false },
    }),
    tailwindcss(),
  ],

  build: {
    // Target modern browsers — smaller bundles, no legacy polyfills
    target: "es2020",
    // Raise inline limit so small images/SVGs skip the network hop
    assetsInlineLimit: 4096,
    // CSS in separate files for better caching
    cssCodeSplit: true,
    // Source maps off in prod for speed
    sourcemap: false,
    // Rollup manualChunks — split heavy vendor libs so pages load only what they need
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("firebase")) return "firebase";
          if (id.includes("jspdf"))       return "jspdf";
          if (id.includes("html2canvas")) return "html2canvas";
          if (id.includes("xlsx") || id.includes("file-saver")) return "sheet-export";
          if (id.includes("gsap") || id.includes("@gsap"))      return "motion";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react-dom"))   return "react-vendor";
          if (id.includes("react"))       return "react-vendor";
        },
        // Deterministic chunk names for better long-term caching
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    // Minification — use Oxc/default (esbuild requires separate install on Vite 8)
    // minify: "esbuild", // removed — use Vite 8 default (oxc)
  },

  // Optimize dep pre-bundling
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "html2canvas/dist/html2canvas.esm.js",
      "jspdf",
    ],
    exclude: ["xlsx"],
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

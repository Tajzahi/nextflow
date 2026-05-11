import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // viteSingleFile() DIHAPUS — memungkinkan code splitting
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Pisahkan library vendor berat ke chunk tersendiri
    // Ini mencegah user mendownload ulang recharts saat navigasi
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — diload pertama, di-cache browser
          "vendor-react": ["react", "react-dom"],
          // Recharts hanya dibutuhkan di DashboardView & LaporanView
          "vendor-recharts": ["recharts"],
          // Lucide icons — dipakai di semua view tapi tidak kritikal saat login
          "vendor-lucide": ["lucide-react"],
        },
      },
    },
    // Nonaktifkan inline assets agar chunking bekerja
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 600,
  },
});

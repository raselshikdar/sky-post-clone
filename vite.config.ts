import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // --- এই অংশটি যোগ করা হয়েছে বিল্ড এরর সমাধান করতে ---
  build: {
    rollupOptions: {
      external: [
        '@capacitor/status-bar',
        '@capgo/capacitor-navigation-bar'
      ],
    },
  },
}));

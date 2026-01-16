import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate music notation libraries into their own chunks for better performance
          if (id.includes('abcjs')) return 'abcjs';
          if (id.includes('flat-embed')) return 'flat-embed';
          if (id.includes('opensheetmusicdisplay')) return 'osmd';
          if (id.includes('vexflow')) return 'vexflow';
          if (id.includes('@coderline/alphatab')) return 'alphatab';

          // Separate large vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('@radix-ui')) return 'radix-ui';
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
          }
        }
      }
    }
  },
});

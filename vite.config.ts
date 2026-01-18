import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async () => {
  // @ts-ignore - __dirname is available in CJS (bundled), import.meta.url in ESM
  const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

  return {
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
        "@": path.resolve(currentDir, "client", "src"),
        "@shared": path.resolve(currentDir, "shared"),
        "@assets": path.resolve(currentDir, "attached_assets"),
      },
    },
    root: path.resolve(currentDir, "client"),
    build: {
      outDir: path.resolve(currentDir, "dist/public"),
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

            // Separate large vendor libraries - keep React and Radix UI together
            // to prevent "Cannot read properties of undefined (reading 'useState')" errors
            if (id.includes('node_modules')) {
              if (id.includes('@radix-ui') || id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
            }
          }
        }
      }
    }
  };
});

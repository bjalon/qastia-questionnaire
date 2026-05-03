import { resolve } from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  root: resolve(__dirname, "examples/integrated"),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "dist-example"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "examples/integrated/index.html"),
    },
  },
});

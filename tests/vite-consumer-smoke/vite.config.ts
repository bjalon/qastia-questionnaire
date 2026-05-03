import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  build: {
    emptyOutDir: true,
    outDir: resolve(__dirname, "../../node_modules/.tmp/form-runtime-vite-smoke"),
  },
});

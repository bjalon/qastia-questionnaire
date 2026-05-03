import { resolve } from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        "form-runtime": resolve(__dirname, "src/index.ts"),
        compiler: resolve(__dirname, "src/compiler.ts"),
        runtime: resolve(__dirname, "src/runtime.ts"),
        runner: resolve(__dirname, "src/runner.ts"),
        preview: resolve(__dirname, "src/preview.ts"),
        designer: resolve(__dirname, "src/designer.ts"),
        storage: resolve(__dirname, "src/storage.ts"),
      },
      name: "FormRuntime",
      fileName: (_format, entryName) => `${entryName}.js`,
      cssFileName: "form-runtime",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime", "yaml", "zod"],
    },
  },
});

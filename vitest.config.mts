import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    /* a nested clone of this repo keeps its own node_modules; running its copy of the
     * tests here would load a second React and fail with invalid hook calls */
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/out/**",
      "**/android-canvas/**",
    ],
  },
});

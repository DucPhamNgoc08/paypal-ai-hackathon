import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Tests must never depend on real credentials from the developer's machine.
    env: {
      PAYPAL_CLIENT_ID: "",
      PAYPAL_CLIENT_SECRET: "",
      AI_API_KEY: "",
    },
  },
});

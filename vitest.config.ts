import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/event-dates.ts",
        "src/lib/volunteer-display-name.ts",
        "src/lib/auth-types.ts",
        "src/lib/kpi.ts",
        "src/lib/day-captain-form.ts",
      ],
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/on-call-status.ts",
        "src/lib/on-call-form.ts",
        "src/lib/on-call-matcher.ts",
        "src/lib/interested-volunteer-form.ts",
        "src/lib/interested-volunteer-matcher.ts",
        "src/lib/actions/interested-volunteers.ts",
        "src/lib/actions/on-call.ts",
        "src/app/api/interested/**/route.ts",
        "src/app/api/on-call/**/route.ts",
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

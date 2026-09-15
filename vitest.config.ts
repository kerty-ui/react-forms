import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        globals: false,
        environment: "jsdom",
        include: ["tests/**/*.spec.{ts,tsx}"],
        setupFiles: ["./tests/setup.react.ts"],
        coverage: {
            provider: "v8",
            include: ["src/lib/**"],
        },
    },
});

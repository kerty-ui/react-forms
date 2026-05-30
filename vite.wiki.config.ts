import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
    plugins: [react(), tailwindcss()],
    root: resolve(rootDir, "src/wiki"),
    resolve: {
        alias: {
            "@kerty-ui/react-forms": resolve(rootDir, "src/lib/index.ts"),
        },
    },
    build: {
        outDir: resolve(rootDir, "dist-wiki"),
        emptyOutDir: true,
    },
});

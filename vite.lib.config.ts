import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
    build: {
        lib: {
            entry: resolve(rootDir, "src/lib/index.ts"),
            name: "kerty-ui-react-forms",
            formats: ["es"],
            fileName: "index",
        },
        rolldownOptions: {
            external: ["react", "react-dom", "react/jsx-runtime"],
        },
        outDir: "dist",
        emptyOutDir: true,
    },
});

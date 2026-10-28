import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  build: {
    rollupOptions: {
      input: {
        home: resolve(projectRoot, "index.html"),
        decision: resolve(projectRoot, "pages/decision.html"),
        editor: resolve(projectRoot, "pages/editor.html"),
        login: resolve(projectRoot, "pages/login.html"),
        visualizador: resolve(projectRoot, "pages/visualizador.html"),
      },
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Set base to your repo name if deploying to GitHub Pages, e.g. "/wedding-tracker/"
export default defineConfig({
  plugins: [react()],
  base: "./",
});

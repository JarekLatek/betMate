// @ts-check
import process from "node:process";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    define: {
      // Override Vite's default .env loading with process.env values (for E2E tests)
      // Only define if process.env has the value (allows normal dev to use .env.local)
      ...(process.env.PUBLIC_SUPABASE_URL && {
        "import.meta.env.PUBLIC_SUPABASE_URL": JSON.stringify(process.env.PUBLIC_SUPABASE_URL),
      }),
      ...(process.env.PUBLIC_SUPABASE_ANON_KEY && {
        "import.meta.env.PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(process.env.PUBLIC_SUPABASE_ANON_KEY),
      }),
      // Server-side variables (used by supabase.server.ts)
      ...(process.env.SUPABASE_URL && {
        "import.meta.env.SUPABASE_URL": JSON.stringify(process.env.SUPABASE_URL),
      }),
      ...(process.env.SUPABASE_KEY && {
        "import.meta.env.SUPABASE_KEY": JSON.stringify(process.env.SUPABASE_KEY),
      }),
    },
  },
  adapter: node({
    mode: "standalone",
  }),
});

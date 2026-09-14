/* global module */
/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Import cycles make the blast radius of a change harder to predict.",
      from: {},
      to: { circular: true },
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      comment: "All local application imports must resolve through the project toolchain.",
      from: {},
      to: {
        couldNotResolve: true,
        pathNot: ["^(https:|npm:|jsr:)"],
      },
    },
    {
      name: "client-not-to-server",
      severity: "error",
      comment:
        "React components and browser API wrappers must use HTTP instead of server services or the server Supabase client.",
      from: { path: "^src/(components|lib/api)/" },
      to: { path: "^src/(lib/services/|db/supabase[.]server[.]ts$)" },
    },
    {
      name: "server-not-to-browser-db",
      severity: "error",
      comment: "Server routes, middleware, and services must not import the browser Supabase client.",
      from: { path: "^src/(pages|middleware|lib/services)/" },
      to: { path: "^src/db/supabase[.]browser[.]ts$" },
    },
    {
      name: "services-not-to-presentation",
      severity: "error",
      comment: "Business services must not depend on pages or UI components.",
      from: { path: "^src/lib/services/" },
      to: { path: "^src/(components|pages)/" },
    },
  ],
  options: {
    doNotFollow: { path: ["node_modules"] },
    exclude: { path: ["[.](?:test|spec)[.](?:ts|tsx)$"] },
    moduleSystems: ["cjs", "es6"],
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
    },
  },
};

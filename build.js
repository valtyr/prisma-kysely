const esbuild = require("esbuild");

console.time("⭐ Built Kysely Prisma generator");
esbuild.build({
  entryPoints: ["src/bin.ts"],
  bundle: true,
  outfile: "dist/bin.js",
  platform: "node",
  packages: "external",
});
console.timeLog("⭐ Built Kysely Prisma generator");

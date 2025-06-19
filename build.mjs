/* global console */
/* global process */
/* eslint no-console: "off" */
/* eslint no-process-exit: "off" */

import esbuild from "esbuild";

esbuild
  .build({
    entryPoints: ["src/main.ts"],
    bundle: true, // Bundle imported functions
    outfile: "dist/main.cjs",
    platform: "node", // or 'node', depending on your target platform
    loader: {
      ".ts": "ts", // Load TypeScript files
    },
    resolveExtensions: [".ts", ".js"],
    external: [
      "@medplum/core",
      "@modelcontextprotocol/sdk",
      "cors",
      "dotenv",
      "express",
      "zod",
    ], // Exclude these packages from the bundle
    format: "cjs", // Set output format as ECMAScript modules
    target: "es2020", // Set the target ECMAScript version
    tsconfig: "tsconfig.json",
  })
  .then(() => {
    console.log("Build completed successfully!");
  })
  .catch((error) => {
    console.error("Build failed:", JSON.stringify(error, null, 2));
    process.exit(1);
  });

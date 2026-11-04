import type { NextConfig } from "next";

// RainbowKit transitively pulls in Coinbase's Base Account connector, whose
// @coinbase/cdp-sdk does optional dynamic imports of @x402/* payment modules that are
// not installed. iMON never uses x402 payments, so stub those specifiers to an empty
// module. (Next 16 uses Turbopack for dev and build.)
const x402Stubs = [
  "@x402/core",
  "@x402/core/client",
  "@x402/evm",
  "@x402/evm/exact/client",
  "@x402/evm/upto/client",
  "@x402/svm",
  "@x402/svm/exact/client",
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // Pin root so Turbopack doesn't walk to ~/ and choke on ABI JSON / lockfiles.
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
    resolveAlias: Object.fromEntries(
      x402Stubs.map((m) => [m, "./lib/empty-module.ts"]),
    ),
  },
};

export default nextConfig;

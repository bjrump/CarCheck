/** @type {import("next").NextConfig} */
const nextConfig = {
  agentRules: false,
  devIndicators: false,
  turbopack: { root: __dirname },
  serverExternalPackages: ["convex-test"],
};
module.exports = nextConfig;

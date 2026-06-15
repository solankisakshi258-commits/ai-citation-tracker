import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the Prisma client external to the server bundle.
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;

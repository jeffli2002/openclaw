import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
<<<<<<< HEAD
  ignoreBuildErrors: true,
=======
  outputFileTracingRoot: process.cwd(),
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
>>>>>>> 8d2abf78b8490403831aae82052e8e107054b856
};

export default nextConfig;

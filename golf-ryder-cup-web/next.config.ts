import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone for optimized container deployments
  output: "standalone",
  
  // Disable telemetry in production
  telemetry: {
    disabled: true,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@platform/runtime"],
  poweredByHeader: false,
};

export default config;

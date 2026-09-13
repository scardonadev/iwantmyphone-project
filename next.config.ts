import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // set img.appledb.dev as allowed image domain
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // El doble asterisco permite cualquier dominio
      },
    ],
  },
};

export default nextConfig;

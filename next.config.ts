import type { NextConfig } from "next";

// Sheep photos live in the public Supabase storage bucket; allow next/image to
// optimize them. Falls back to a placeholder host so builds without env
// (e.g. CI) still succeed — pages are dynamic and never fetch at build time.
const supabaseHost = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co"
).hostname;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/sheep-photos/**",
      },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Deny framing (clickjacking protection)
          { key: "X-Frame-Options", value: "DENY" },
          // Force HTTPS for 1 year
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Disable browser DNS prefetching to prevent data leakage
          { key: "X-DNS-Prefetch-Control", value: "off" },
          // Restrict referrer information
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Restrict browser features
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Allow Clerk popup windows (OAuth flows) but isolate the browsing context
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          // Prevent this site's resources from being loaded cross-origin
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          // Legacy XSS filter for older browsers
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://*.clerk.services https://clerk.wineryo.me https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://*.clerk.com https://*.clerk.accounts.dev https://*.clerk.services https://clerk.wineryo.me",
              "img-src 'self' data: blob: https://images.unsplash.com https://img.clerk.com https://*.clerk.com https://*.clerk.accounts.dev https://*.clerk.services",
              "font-src 'self' data: https://*.clerk.com https://*.clerk.accounts.dev https://*.clerk.services",
              "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.clerk.services https://clerk.wineryo.me https://accounts.wineryo.me https://*.supabase.co wss://*.supabase.co wss://*.clerk.accounts.dev",
              "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.clerk.services https://accounts.wineryo.me https://challenges.cloudflare.com",
              "worker-src 'self' blob: https://*.clerk.com https://*.clerk.accounts.dev https://*.clerk.services",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.clerk.services https://clerk.wineryo.me https://accounts.wineryo.me",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

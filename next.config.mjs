import { randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// In dev, use a fixed ID so the SW cache isn't busted on every hot reload.
// In production, generate a fresh ID per build to force SW update.
const BUILD_ID = process.env.NODE_ENV === "development"
  ? "dev"
  : randomBytes(4).toString("hex");

/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Force HTTPS for 2 years, incluyendo subdominios. Permite preload en navegadores.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow embedding in iframes (clickjacking protection)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  // Limit referrer information sent to third parties
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict access to browser features not used by this app
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(), microphone=(), payment=()"
  },
  // El filtro XSS heredado está deprecado y puede introducir vulnerabilidades;
  // la guía moderna (OWASP) es desactivarlo y confiar en el CSP.
  { key: "X-XSS-Protection", value: "0" },
  // Content Security Policy — 'unsafe-inline' needed for Tailwind + theme detection script
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // React Fast Refresh uses eval() in development; production keeps it out.
      // va.vercel-scripts.com: script de debug de Vercel Analytics (solo dev;
      // en producción el script se sirve same-origin vía /_vercel/insights).
      process.env.NODE_ENV === "development"
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com"
        : "script-src 'self' 'unsafe-inline'",
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: blob: https://*.mapbox.com https://*.mapbox.cn https://api.mapbox.com",
      "connect-src 'self' https://*.mapbox.com https://api.mapbox.com",
      "worker-src 'self' blob:",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "manifest-src 'self'",
    ].join("; ")
  }
];

const nextConfig = {
  productionBrowserSourceMaps: false,
  experimental: {
    sri: { algorithm: "sha384" }
  },
  logging: {
    browserToTerminal: process.env.NEXT_E2E === "1" ? false : "warn"
  },

  async redirects() {
    return [
      // El teleférico no es una ruta de camión: su página canónica es la guía
      // dedicada. La URL /ruta/teleferico-uruapan (generada por la plantilla de
      // camión) mostraba info incorrecta, así que se consolida aquí.
      {
        source: "/ruta/teleferico-uruapan",
        destination: "/teleferico-uruapan-horario",
        permanent: true
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "urugo.app" }],
        destination: "https://www.urugo.app/:path*",
        permanent: true
      }
    ];
  },

  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }
        ]
      },
      {
        source: "/(.*)",
        headers: securityHeaders
      },
      {
        source: "/apoyar/mi-aporte",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }]
      }
    ];
  },

  webpack(config, { isServer }) {
    if (!isServer) {
      // Read template, stamp with build ID, write sw.js — keeps template pristine
      const root = process.cwd();
      const template = readFileSync(join(root, "public", "sw.template.js"), "utf8");
      const stamped = template.replace(/__BUILD_ID__/g, BUILD_ID);
      writeFileSync(join(root, "public", "sw.js"), stamped, "utf8");
    }
    return config;
  }
};

export default nextConfig;

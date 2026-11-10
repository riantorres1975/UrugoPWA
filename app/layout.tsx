import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import PWARegistrar from "@/components/PWARegistrar";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import AdaptiveTheme from "@/components/AdaptiveTheme";
import PrivacySafeAnalytics from "@/components/PrivacySafeAnalytics";
import ClientErrorReporter from "@/components/ClientErrorReporter";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";
import "./brand.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "UruGo | Rutas de camiones y Teleférico en Uruapan",
    template: "%s | UruGo"
  },
  description: "Consulta rutas de camiones Uruapan, horario y tarifa del Teleférico 2026. Mapa interactivo multimodal, sin registro ni instalación.",
  applicationName: "UruGo",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "UruGo"
  },
  openGraph: {
    title: "UruGo — Rutas de camiones y Teleférico en Uruapan",
    description: "Encuentra tu ruta en Uruapan. Camiones urbanos y Teleférico en un solo mapa interactivo.",
    url: SITE_URL,
    siteName: "UruGo",
    images: [
      {
        url: `${SITE_URL}/api/og`,
        width: 1200,
        height: 630,
        alt: "UruGo — Mapa de rutas de transporte en Uruapan"
      }
    ],
    locale: "es_MX",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "UruGo — Rutas Uruapan",
    description: "Camiones urbanos y Teleférico en Uruapan en un mapa interactivo.",
    images: ["https://www.urugo.app/api/og"]
  }
};

export const viewport: Viewport = {
  themeColor: "#0c110a",
  // Con teclado abierto, Android Chrome encoge el viewport en vez de panear:
  // los paneles anclados abajo (chat, sheets) quedan visibles sobre el teclado.
  interactiveWidget: "resizes-content"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${playfair.variable} min-h-dvh bg-[var(--background)] font-sans text-[var(--foreground)] antialiased`}
      >
        {/* Inline script runs before paint to set the correct theme and avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var h=new Date().getHours();var dark=h<6||h>=19;document.documentElement.setAttribute('data-theme',dark?'dark':'light');document.documentElement.classList.toggle('dark',dark);})();`
          }}
        />
        <AdaptiveTheme />
        <PWARegistrar />
        <PWAInstallBanner />
        <ClientErrorReporter />
        {children}
        <PrivacySafeAnalytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

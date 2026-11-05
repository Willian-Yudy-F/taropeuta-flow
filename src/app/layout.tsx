import type { Metadata } from "next";
// Self-hosted fonts (@fontsource): shipped from node_modules with the build,
// no network fetch to Google Fonts at build or run time → deploys never fail
// because of an external font CDN, and no visitor data is sent to Google.
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource-variable/figtree";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taropeuta — Tarot & Astrology",
  description: "Tarot and astrology for real-life decisions. A space to reflect, understand, and choose with more confidence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className="font-body grain">{children}</body>
    </html>
  );
}

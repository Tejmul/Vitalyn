import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono, Schibsted_Grotesk, Tiro_Devanagari_Hindi } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const display = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"], weight: ["500", "600", "700", "800", "900"] });
const body = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500", "700"] });
const deva = Tiro_Devanagari_Hindi({ variable: "--font-tiro", subsets: ["devanagari", "latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "Vitalyn: Book hospital appointments near you", template: "%s · Vitalyn" },
  description:
    "Find hospitals near you, see how far they are, book an OPD slot and get your token on your phone before you leave home.",
};

export const viewport: Viewport = { themeColor: "#1645F5" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} ${deva.variable}`}>
      <body className="min-h-dvh">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

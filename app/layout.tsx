import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-dm-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "barberia.growingsolutions", template: "%s | barberia.growingsolutions" },
  description: "Agenda inteligente para barberías y salones, por Growing Solutions."
};

// Las variables de fuente van en <html> porque :root las usa en --font-body y --font-display.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" data-theme="barberia" className={`${inter.variable} ${dmSerif.variable}`}><body>{children}</body></html>;
}

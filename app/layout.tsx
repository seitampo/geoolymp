import type { Metadata } from "next";
import { Golos_Text, Unbounded } from "next/font/google";
import { SubmitGuard } from "@/components/SubmitGuard";
import "./globals.css";

// Текст и интерфейс — Golos Text (кириллица родная), заголовки — Unbounded
// (характерный широкий гротеск, только для крупных заголовков и цифр).
const golos = Golos_Text({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Olympic Meridian",
  description: "Платформа подготовки школьников Казахстана к олимпиадам по географии",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${golos.variable} ${unbounded.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-sm text-ink antialiased">
        {children}
        <SubmitGuard />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Golos_Text, Unbounded } from "next/font/google";
import { SubmitGuard } from "@/components/SubmitGuard";
import { getLocale, getT } from "@/lib/i18n";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: "Olympic Meridian",
    description: t("meta.description"),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${golos.variable} ${unbounded.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-sm text-ink antialiased">
        {children}
        <SubmitGuard />
      </body>
    </html>
  );
}

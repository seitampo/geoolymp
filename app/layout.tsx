import type { Metadata } from "next";
import { Golos_Text, Unbounded } from "next/font/google";
import { SubmitGuard } from "@/components/SubmitGuard";
import { getLocale, getT } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";
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
  const locale = await getLocale();
  const title = "Olympic Meridian";
  const description = t("meta.description");

  // metadataBase делает относительные ссылки на og-картинку абсолютными —
  // без него соцсети и мессенджеры не покажут превью ссылки.
  return {
    metadataBase: new URL(siteUrl()),
    title,
    description,
    openGraph: {
      type: "website",
      siteName: title,
      title,
      description,
      locale: locale === "kk" ? "kk_KZ" : "ru_KZ",
      url: "/",
    },
    twitter: { card: "summary_large_image", title, description },
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

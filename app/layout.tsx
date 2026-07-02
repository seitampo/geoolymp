import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoOlymp",
  description: "MVP платформы для подготовки олимпиадников по географии",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-gray-50 font-sans text-sm text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}

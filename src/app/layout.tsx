import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AssetSanitize — private image metadata cleaner",
  icons: { icon: "/favicon.svg" },
  description:
    "Inspect JPEG and PNG metadata and create a verified, freshly encoded PNG. Everything happens on your device. A self-initiated ConsoleLog Studio project.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

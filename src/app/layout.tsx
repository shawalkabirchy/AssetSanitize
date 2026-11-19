import type { Metadata, Viewport } from "next";
import "@fontsource-variable/ibm-plex-sans/wght.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "AssetSanitize — remove EXIF and GPS data from photos",
  icons: { icon: "/favicon.svg" },
  description:
    "See the location, camera and time stored in JPEG and PNG files, then download clean, verified PNG copies. Everything happens on your device. A self-initiated ConsoleLog Studio project.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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

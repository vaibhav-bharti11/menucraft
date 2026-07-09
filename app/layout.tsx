import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MenuCraft — The Embassy Catering",
  description:
    "Internal menu builder for The Embassy Catering — build branded client menu PDFs in under 10 minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

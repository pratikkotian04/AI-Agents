import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Rent Finder",
  description: "Multi-agent apartment search for Indian rental listings.",
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

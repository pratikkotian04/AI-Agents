import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Requirement Agent",
  description: "Multi-agent recruiter workspace for drafting job requirements."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

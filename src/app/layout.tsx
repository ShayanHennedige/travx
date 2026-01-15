import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TravX - Travel Agency Inquiry Management",
  description: "Professional inquiry management system for travel agencies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

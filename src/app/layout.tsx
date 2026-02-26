import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";

export const metadata: Metadata = {
  title: "TravX - Travel Agency Inquiry Management",
  description: "Professional inquiry management system for travel agencies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `(() => {
    try {
      const storageKey = "theme";
      const root = document.documentElement;
      let theme = window.localStorage.getItem(storageKey);
      if (theme !== "light" && theme !== "dark") {
        theme = "dark";
      }
      root.classList.remove("light", "dark");
      root.classList.add(theme);
    } catch (_) {
      // fail silently
    }
  })();`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased bg-surface-900 text-surface-100 light:bg-surface-100 light:text-surface-900">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/features/theme/theme-provider";

export const metadata: Metadata = {
  title: "LASU Navigator",
  description: "Offline walking navigation for LASU Ojo campus.",
  applicationName: "LASU Navigator",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "LASU Nav" },
  icons: { icon: "./icons/icon.svg", apple: "./icons/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#0b6b46", colorScheme: "light dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

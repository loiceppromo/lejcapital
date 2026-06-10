import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LEJ Capital Management",
  description: "Internal fund, cycle, sleeve, and investor management system.",
  icons: {
    icon: "/brand/lej-favicon.png",
    shortcut: "/brand/lej-favicon.png",
    apple: "/brand/lej-icon-light.png",
  },
  applicationName: "LEJ Capital Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

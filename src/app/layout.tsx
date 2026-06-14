import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LEJ Capital Management",
  description: "Internal fund, cycle, sleeve, and capital management system.",
  icons: {
    icon: "/brand/lej-favicon.png",
    shortcut: "/brand/lej-favicon.png",
    apple: "/brand/lej-icon-light.png",
  },
  applicationName: "LEJ Capital Management",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint to avoid a white flash
            (FOUC) on initial load and full-page refreshes. Runs synchronously
            in <head>; the toggle keeps localStorage + class in sync thereafter. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('lej-dark-mode')==='true'){document.documentElement.classList.add('dark-mode');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

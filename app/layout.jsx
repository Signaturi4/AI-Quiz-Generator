import "./globals.css";

import { Inter } from "next/font/google";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Nuanu Certifications Portal",
  icons: {
    icon: "/icons/logo.jpg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased min-h-screen bg-background text-foreground`}
      >
        {children}
        <Script
          async
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-BKK7659J87"
        />
        <Script strategy="afterInteractive" src="/analytics.js" />
      </body>
    </html>
  );
}

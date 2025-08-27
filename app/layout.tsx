import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/Header";
import { BrowserBlocker } from "@/components/BrowserBlocker";


export const metadata: Metadata = {
  title: "n8n Growth Agents",
  description: "AI-assisted n8n workflow builder by Ghost Team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body
        className={`antialiased overflow-x-hidden`}
      >
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=G-BVX33VY3NJ`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-BVX33VY3NJ');
          `}
        </Script>
        
        <div className="min-h-screen">
          <BrowserBlocker />
          <Header />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

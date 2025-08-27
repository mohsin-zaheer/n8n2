import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/Header";


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
        <div className="min-h-screen">
          <Header />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

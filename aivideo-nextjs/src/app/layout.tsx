import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Video Generator - Create Stunning Videos from Text",
  description: "Transform your ideas into professional videos with AI-powered storyboard generation, image creation, and video production.",
  keywords: ["AI video generator", "text to video", "storyboard", "artificial intelligence"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
          {children}
        </div>
      </body>
    </html>
  );
}

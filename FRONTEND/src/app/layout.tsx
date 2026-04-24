import type { Metadata } from "next";
import { Inter, Outfit, DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const outfit = Outfit({ 
  subsets: ["latin"], 
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700"] 
});

const dmSans = DM_Sans({ 
  subsets: ["latin"], 
  variable: "--font-dm-sans",
  weight: ["400", "500", "700"] 
});

export const metadata: Metadata = {
  title: "AI Content Factory",
  description: "Production-grade AI content pipeline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${dmSans.variable} font-sans bg-background text-foreground antialiased`}>
        <Toaster position="bottom-right" />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

import { getBrandName } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  let brandName = "Institution";
  try {
    brandName = await getBrandName();
  } catch {
    // Keep static fallback metadata when DB is unavailable.
  }
  return {
    title: `${brandName} | Professional Training Courses`,
    description: `Official portal for ${brandName}, providing modern computer education and professional training.`,
  };
}

import { BrandProvider } from "@/context/BrandContext";
import { AuthProvider } from "@/context/AuthContext";
import { getFullBrandData } from "@/lib/settings";
import ServiceWorkerCleanup from "@/components/ServiceWorkerCleanup";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let brandData: Record<string, string> = {};
  try {
    brandData = await getFullBrandData();
  } catch {
    brandData = {};
  }

  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <BrandProvider initialData={brandData}>
            <ServiceWorkerCleanup />
            {children}
          </BrandProvider>
        </AuthProvider>
        <ScrollToTopButton />
      </body>
    </html>
  );
}

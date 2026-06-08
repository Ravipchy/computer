import type { Metadata } from "next";

import { getBrandName } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const brandName = await getBrandName();
  return {
    title: `Admin Panel | ${brandName}`,
    description: "ATC Application Management Admin Panel",
  };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Standalone layout — no site Navbar or Footer
  return <>{children}</>;
}

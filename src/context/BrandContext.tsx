"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface BrandContextType {
  brandName: string;
  brandMobile: string;
  brandEmail: string;
  brandAddress: string;
  brandUrl: string;
  brandLogo: string;
  loading: boolean;
}

const BrandContext = createContext<BrandContextType>({
  brandName: "",
  brandMobile: "",
  brandEmail: "",
  brandAddress: "",
  brandUrl: "",
  brandLogo: "",
  loading: true,
});

export const BrandProvider = ({ 
  children,
  initialData = {}
}: { 
  children: React.ReactNode;
  initialData?: Record<string, string>;
}) => {
  const [brandName, setBrandName] = useState(initialData.brand_name || "");
  const [brandMobile, setBrandMobile] = useState(initialData.brand_mobile || "");
  const [brandEmail, setBrandEmail] = useState(initialData.brand_email || "");
  const [brandAddress, setBrandAddress] = useState(initialData.brand_address || "");
  const [brandUrl, setBrandUrl] = useState(initialData.brand_url || "");
  const [brandLogo, setBrandLogo] = useState(initialData.brand_logo || "");
  const [loading, setLoading] = useState(!initialData.brand_name);

  const fetchBrand = async () => {
    try {
      const res = await fetch("/api/public/brand", { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as Partial<Record<string, string>>;
        // Always overwrite local values so refresh never shows stale settings.
        setBrandName(data.brand_name ?? "");
        setBrandMobile(data.brand_mobile ?? "");
        setBrandEmail(data.brand_email ?? "");
        setBrandAddress(data.brand_address ?? "");
        setBrandUrl(data.brand_url ?? "");
        setBrandLogo(data.brand_logo ?? "");
      }
    } catch (err) {
      console.error("Failed to fetch brand settings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrand();
  }, []);

  return (
    <BrandContext.Provider value={{ brandName, brandMobile, brandEmail, brandAddress, brandUrl, brandLogo, loading }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => useContext(BrandContext);

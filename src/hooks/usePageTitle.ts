"use client";

import { useEffect } from "react";
import { useBrand } from "@/context/BrandContext";

type Role = "admin" | "atc" | "student";

export const usePageTitle = (role: Role) => {
  const { brandName } = useBrand();

  useEffect(() => {
    const roleLabels: Record<Role, string> = {
      admin: "Admin Panel",
      atc: "Institute Panel",
      student: "Student Portal",
    };
    
    const label = roleLabels[role] || "Portal";
    const newTitle = `${label} | ${brandName}`;
    
    if (document.title !== newTitle) {
      document.title = newTitle;
    }
  }, [role, brandName]);
};

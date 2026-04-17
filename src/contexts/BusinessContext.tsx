"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type BusinessType = "WINE" | "FOOD";

interface BusinessContextValue {
  businessType: BusinessType | null;
  businessName: string;
  currency: string;
  businessId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextValue>({
  businessType: null,
  businessName: "",
  currency: "UGX",
  businessId: null,
  loading: true,
  refresh: async () => {},
});

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBusiness = async () => {
    try {
      const res = await fetch("/api/business", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.business) {
          setBusinessType((data.business.businessType as BusinessType) || "WINE");
          setBusinessName(data.business.name || "");
          setCurrency(data.business.currency || "UGX");
          setBusinessId(data.business.id || null);
        } else {
          // No business yet — reset to defaults so the dashboard can show the setup screen
          setBusinessType(null);
          setBusinessName("");
          setCurrency("UGX");
          setBusinessId(null);
        }
      }
    } catch {
      // Network error — leave defaults in place
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clean up any legacy sessionStorage entries from previous versions
    try {
      sessionStorage.removeItem("winery_biz_ctx");
      sessionStorage.removeItem("winery_active_biz");
    } catch { /* ignore */ }
    fetchBusiness();
  }, []);

  return (
    <BusinessContext.Provider
      value={{ businessType, businessName, currency, businessId, loading, refresh: fetchBusiness }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  return useContext(BusinessContext);
}

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

  const CACHE_KEY = "winery_biz_ctx";

  const applyData = (biz: { businessType?: string; name?: string; currency?: string; id?: string }) => {
    setBusinessType((biz.businessType as BusinessType) || "WINE");
    setBusinessName(biz.name || "");
    setCurrency(biz.currency || "UGX");
    setBusinessId(biz.id || null);
  };

  const fetchBusiness = async (bust = false) => {
    // Serve from sessionStorage when available — avoids a round-trip on every navigation
    if (!bust) {
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) {
          applyData(JSON.parse(raw));
          setLoading(false);
          return;
        }
      } catch {
        // sessionStorage unavailable (SSR guard)
      }
    }

    try {
      const res = await fetch("/api/business");
      if (res.ok) {
        const data = await res.json();
        if (data.business) {
          applyData(data.business);
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data.business)); } catch { /* ignore */ }
        }
      }
    } catch {
      // Business may not exist yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusiness();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BusinessContext.Provider
      value={{ businessType, businessName, currency, businessId, loading, refresh: () => fetchBusiness(true) }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  return useContext(BusinessContext);
}

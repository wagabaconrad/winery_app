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

// sessionStorage keys
const POINTER_KEY = "winery_active_biz";
const bizCacheKey = (id: string) => `winery_biz_ctx_${id}`;

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyData = (biz: { businessType?: string; name?: string; currency?: string; id?: string }) => {
    setBusinessType((biz.businessType as BusinessType) || "WINE");
    setBusinessName(biz.name || "");
    setCurrency(biz.currency || "UGX");
    setBusinessId(biz.id || null);
  };

  const fetchBusiness = async (bust = false) => {
    if (!bust) {
      try {
        // Read the pointer to find which user's cache entry is active
        const activeId = sessionStorage.getItem(POINTER_KEY);
        if (activeId) {
          const raw = sessionStorage.getItem(bizCacheKey(activeId));
          if (raw) {
            applyData(JSON.parse(raw));
            setLoading(false);
            return;
          }
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
          // Cache under business-scoped key so different users never share the same entry
          if (data.business.id) {
            try {
              sessionStorage.setItem(POINTER_KEY, data.business.id);
              sessionStorage.setItem(bizCacheKey(data.business.id), JSON.stringify(data.business));
              // Clean up the old unscoped legacy key if it still exists
              sessionStorage.removeItem("winery_biz_ctx");
            } catch { /* ignore */ }
          }
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

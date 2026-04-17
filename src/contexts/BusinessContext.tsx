"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useUser } from "@clerk/nextjs";

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
  const { user, isLoaded: userLoaded } = useUser();
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getCacheKey = (uid: string | undefined) =>
    uid ? `winery_biz_ctx_${uid}` : null;

  const applyData = (biz: { businessType?: string; name?: string; currency?: string; id?: string }) => {
    setBusinessType((biz.businessType as BusinessType) || "WINE");
    setBusinessName(biz.name || "");
    setCurrency(biz.currency || "UGX");
    setBusinessId(biz.id || null);
  };

  const fetchBusiness = async (bust = false, uid?: string) => {
    const cacheKey = getCacheKey(uid);

    // Serve from sessionStorage when available — avoids a round-trip on every navigation
    if (!bust && cacheKey) {
      try {
        const raw = sessionStorage.getItem(cacheKey);
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
          if (cacheKey) {
            try { sessionStorage.setItem(cacheKey, JSON.stringify(data.business)); } catch { /* ignore */ }
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
    if (!userLoaded) return;
    // Remove any legacy unscoped cache entry so stale data can't leak to new users
    try { sessionStorage.removeItem("winery_biz_ctx"); } catch { /* ignore */ }
    fetchBusiness(false, user?.id);
  }, [userLoaded, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BusinessContext.Provider
      value={{ businessType, businessName, currency, businessId, loading, refresh: () => fetchBusiness(true, user?.id) }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  return useContext(BusinessContext);
}

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  Receipt,
  BarChart3,
  Package,
  ShoppingCart,
  FlaskConical,
  AlertTriangle,
  Wine,
  UtensilsCrossed,
  CalendarDays,
} from "lucide-react";
import { useBusinessContext } from "@/contexts/BusinessContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import StatCard from "@/components/StatCard";
import { LoadingSpinner, Button } from "@/components/ui";

interface DashboardData {
  totalCapital: number;
  totalRevenue: number;
  totalExpenses: number;
  totalCOGS: number;
  netProfit: number;
  totalStockValue: number;
  stockItemCount: number;
  lowStockItems: { id: string; name: string; quantity: number; unit: string }[];
  recentSales: {
    id: string;
    totalAmount: number;
    date: string;
    customer: { name: string } | null;
    items: { productName: string }[];
  }[];
  activeBatches: {
    id: string;
    name: string;
    status: string;
    totalCost: number;
  }[];
  salesCount: number;
  // Food business fields
  draftEvents?: number;
  confirmedEvents?: number;
  completedEvents?: number;
  recentEvents?: {
    id: string;
    name: string;
    eventType: string;
    status: string;
    customerBudget: number;
    eventDate: string | null;
    customer: { name: string } | null;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsBusiness, setNeedsBusiness] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [openingCapital, setOpeningCapital] = useState("");
  const [businessType, setBusinessType] = useState<"WINE" | "FOOD">("WINE");
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const { refresh: refreshBusiness, businessType: currentBusinessType } = useBusinessContext();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.status === 404) {
        setNeedsBusiness(true);
        setLoading(false);
        return;
      }
      const json = await res.json();

      if (!res.ok && res.status !== 404) {
        console.error("Dashboard Error:", json.error, json.details, json.stack);
        setLoading(false);
        return;
      }

      setData(json);
    } catch {
      // No business yet
      setNeedsBusiness(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: businessName, currency, openingCapital, businessType }),
      });
      if (res.ok) {
        await refreshBusiness();
        setNeedsBusiness(false);
        setLoading(true);
        fetchDashboard();
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (needsBusiness) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <div
            className="rounded-2xl p-8"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
          >
            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Welcome to Winery OS
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Choose your business type and set up to get started.
            </p>

            <form onSubmit={handleCreateBusiness} className="space-y-5">
              {/* Business Type Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  What type of business are you?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBusinessType("WINE")}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all cursor-pointer"
                    style={{
                      background: businessType === "WINE" ? "rgba(124, 58, 237, 0.15)" : "var(--bg-primary)",
                      border: businessType === "WINE" ? "2px solid #7c3aed" : "1px solid var(--border-color)",
                    }}
                  >
                    <Wine size={28} style={{ color: businessType === "WINE" ? "#7c3aed" : "var(--text-muted)" }} />
                    <span className="text-sm font-semibold" style={{ color: businessType === "WINE" ? "#7c3aed" : "var(--text-primary)" }}>
                      Wine Business
                    </span>
                    <span className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                      Production, batches, inventory & sales
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusinessType("FOOD")}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all cursor-pointer"
                    style={{
                      background: businessType === "FOOD" ? "rgba(16, 185, 129, 0.15)" : "var(--bg-primary)",
                      border: businessType === "FOOD" ? "2px solid #10b981" : "1px solid var(--border-color)",
                    }}
                  >
                    <UtensilsCrossed size={28} style={{ color: businessType === "FOOD" ? "#10b981" : "var(--text-muted)" }} />
                    <span className="text-sm font-semibold" style={{ color: businessType === "FOOD" ? "#10b981" : "var(--text-primary)" }}>
                      Food / Catering
                    </span>
                    <span className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                      Events, catering, budgets & invoices
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={businessType === "WINE" ? "e.g. Kampala Winery" : "e.g. Grace's Catering"}
                  required
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="UGX">UGX — Ugandan Shilling</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="KES">KES — Kenyan Shilling</option>
                    <option value="TZS">TZS — Tanzanian Shilling</option>
                    <option value="RWF">RWF — Rwandan Franc</option>
                    <option value="NGN">NGN — Nigerian Naira</option>
                    <option value="ZAR">ZAR — South African Rand</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    Opening Capital
                  </label>
                  <input
                    type="number"
                    value={openingCapital}
                    onChange={(e) => setOpeningCapital(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              </div>

              {/* Capital Warning */}
              {businessType === "WINE" && openingCapital && parseFloat(openingCapital) > 0 && (
                <div
                  className="flex items-start gap-2 p-3 rounded-xl text-xs"
                  style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#f59e0b" }}
                >
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Be careful:</strong> Initial capital is irreversible for wine businesses. It can only be topped up, never reduced. Double-check your amount before proceeding.
                  </span>
                </div>
              )}

              <Button type="submit" loading={creating} className="w-full">
                Create Business
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  const chartData = data.recentSales.map((s) => ({
    name: new Date(s.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    amount: s.totalAmount,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Capital"
          value={data.totalCapital.toLocaleString()}
          icon={Wallet}
          accentColor="#7c3aed"
          delay={0}
        />
        <StatCard
          title="Total Revenue"
          value={data.totalRevenue.toLocaleString()}
          icon={TrendingUp}
          accentColor="#10b981"
          delay={0.1}
        />
        <StatCard
          title="Total Expenses"
          value={data.totalExpenses.toLocaleString()}
          icon={Receipt}
          accentColor="#f59e0b"
          delay={0.2}
        />
        <StatCard
          title="Net Profit"
          value={data.netProfit.toLocaleString()}
          icon={BarChart3}
          trend={data.netProfit >= 0 ? "up" : "down"}
          accentColor={data.netProfit >= 0 ? "#10b981" : "#ef4444"}
          delay={0.3}
        />
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Recent Sales
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                <XAxis dataKey="name" stroke="#6b6b7b" fontSize={12} />
                <YAxis stroke="#6b6b7b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "#16161e",
                    border: "1px solid #2a2a3a",
                    borderRadius: "12px",
                    color: "#f0f0f5",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#7c3aed"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No sales data yet. Create your first sale to see charts.
              </p>
            </div>
          )}
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl p-5 space-y-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Quick Stats
          </h3>

          <div className="space-y-3">
            {currentBusinessType !== "FOOD" && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-primary)" }}>
                <Package size={18} style={{ color: "#3b82f6" }} />
                <div className="flex-1">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Stock Items</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{data.stockItemCount}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-primary)" }}>
              <ShoppingCart size={18} style={{ color: "#10b981" }} />
              <div className="flex-1">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Sales</p>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{data.salesCount}</p>
              </div>
            </div>

            {currentBusinessType === "FOOD" ? (
              <>
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-primary)" }}>
                  <CalendarDays size={18} style={{ color: "#3b82f6" }} />
                  <div className="flex-1">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Confirmed Events</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{data.confirmedEvents || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-primary)" }}>
                  <CalendarDays size={18} style={{ color: "#f59e0b" }} />
                  <div className="flex-1">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Draft Events</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{data.draftEvents || 0}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-primary)" }}>
                  <FlaskConical size={18} style={{ color: "#a855f7" }} />
                  <div className="flex-1">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Active Batches</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{data.activeBatches.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-primary)" }}>
                  <Wallet size={18} style={{ color: "#f59e0b" }} />
                  <div className="flex-1">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Stock Value</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{data.totalStockValue.toLocaleString()}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Sales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Recent Sales
            </h3>
            <button
              onClick={() => router.push("/sales")}
              className="text-xs font-medium"
              style={{ color: "var(--accent-secondary)" }}
            >
              View all
            </button>
          </div>
          {data.recentSales.length > 0 ? (
            <div className="space-y-2">
              {data.recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "var(--bg-primary)" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {sale.customer?.name || "Walk-in Customer"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {sale.items.map((i) => i.productName).join(", ")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--success)" }}>
                    {sale.totalAmount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
              No sales yet
            </p>
          )}
        </motion.div>

        {/* Right panel: Low Stock (Wine) or Upcoming Events (Food) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          {currentBusinessType === "FOOD" ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Upcoming Events
                </h3>
                <button
                  onClick={() => router.push("/events")}
                  className="text-xs font-medium"
                  style={{ color: "var(--accent-secondary)" }}
                >
                  View all
                </button>
              </div>
              {data.recentEvents && data.recentEvents.length > 0 ? (
                <div className="space-y-2">
                  {data.recentEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: "var(--bg-primary)" }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {event.name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {event.eventType} • {event.customer?.name || "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            background: event.status === "CONFIRMED" ? "rgba(59,130,246,0.15)" : "rgba(107,114,128,0.15)",
                            color: event.status === "CONFIRMED" ? "#60a5fa" : "#9ca3af",
                          }}
                        >
                          {event.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
                  No upcoming events
                </p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Low Stock Alerts
                </h3>
                <button
                  onClick={() => router.push("/stock")}
                  className="text-xs font-medium"
                  style={{ color: "var(--accent-secondary)" }}
                >
                  Manage stock
                </button>
              </div>
              {data.lowStockItems.length > 0 ? (
                <div className="space-y-2">
                  {data.lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: "var(--bg-primary)" }}
                    >
                      <AlertTriangle size={16} style={{ color: "var(--warning)" }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {item.name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--danger)" }}>
                          Only {item.quantity} {item.unit} left
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
                  All stock levels are healthy
                </p>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

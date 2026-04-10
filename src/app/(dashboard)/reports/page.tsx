"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, ShoppingCart, Receipt } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { LoadingSpinner } from "@/components/ui";

interface ReportData {
  period: string;
  totalRevenue: number;
  totalCOGS: number;
  totalExpenses: number;
  netProfit: number;
  salesCount: number;
  batchCount: number;
  chartData: { date: string; revenue: number; expenses: number; profit: number }[];
  bestSellers: { name: string; quantity: number; revenue: number }[];
  expenseBreakdown: { category: string; amount: number }[];
}

const COLORS = ["#7c3aed", "#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?period=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [period]);

  const periods = [
    { value: "daily", label: "Today" },
    { value: "weekly", label: "This Week" },
    { value: "monthly", label: "This Month" },
    { value: "yearly", label: "This Year" },
  ];

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Reports & Analytics" description="Financial reports and performance insights" />

      {/* Period Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {periods.map((p) => (
          <button key={p.value} onClick={() => setPeriod(p.value)} className="px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all" style={{ background: period===p.value?"var(--accent-gradient)":"var(--bg-card)", color: period===p.value?"#fff":"var(--text-secondary)", border: period===p.value?"none":"1px solid var(--border-color)" }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Revenue" value={data.totalRevenue.toLocaleString()} icon={TrendingUp} accentColor="#10b981" delay={0} />
        <StatCard title="Expenses" value={data.totalExpenses.toLocaleString()} icon={Receipt} accentColor="#f59e0b" delay={0.1} />
        <StatCard title="Net Profit" value={data.netProfit.toLocaleString()} icon={BarChart3} accentColor={data.netProfit >= 0 ? "#10b981" : "#ef4444"} delay={0.2} />
        <StatCard title="Sales" value={data.salesCount} icon={ShoppingCart} accentColor="#3b82f6" delay={0.3} />
      </div>

      {/* Revenue vs Expenses Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Revenue vs Expenses</h3>
        {data.chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="date" stroke="#6b6b7b" fontSize={11} />
              <YAxis stroke="#6b6b7b" fontSize={11} />
              <Tooltip contentStyle={{ background: "#16161e", border: "1px solid #2a2a3a", borderRadius: "12px", color: "#f0f0f5" }} />
              <Bar dataKey="revenue" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="expenses" fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-sm py-12 text-center" style={{ color: "var(--text-muted)" }}>No data for this period</p>}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profit Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Profit Trend</h3>
          {data.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                <XAxis dataKey="date" stroke="#6b6b7b" fontSize={11} />
                <YAxis stroke="#6b6b7b" fontSize={11} />
                <Tooltip contentStyle={{ background: "#16161e", border: "1px solid #2a2a3a", borderRadius: "12px", color: "#f0f0f5" }} />
                <Line type="monotone" dataKey="profit" stroke="#7c3aed" strokeWidth={2} dot={{ fill: "#7c3aed", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm py-12 text-center" style={{ color: "var(--text-muted)" }}>No data</p>}
        </motion.div>

        {/* Expense Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Expense Breakdown</h3>
          {data.expenseBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.expenseBreakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80} label>
                  {data.expenseBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#16161e", border: "1px solid #2a2a3a", borderRadius: "12px", color: "#f0f0f5" }} />
                <Legend wrapperStyle={{ fontSize: "11px", color: "#9898a8" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm py-12 text-center" style={{ color: "var(--text-muted)" }}>No expenses</p>}
        </motion.div>
      </div>

      {/* Best Selling Products */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Best Selling Products</h3>
        {data.bestSellers.length > 0 ? (
          <div className="space-y-2">
            {data.bestSellers.map((product, i) => (
              <div key={product.name} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-primary)" }}>
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: COLORS[i % COLORS.length] + "20", color: COLORS[i % COLORS.length] }}>{i + 1}</span>
                <div className="flex-1"><p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{product.name}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>{product.quantity} units sold</p></div>
                <p className="text-sm font-semibold" style={{ color: "var(--success)" }}>{product.revenue.toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>No sales data yet</p>}
      </motion.div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Receipt, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { Button, LoadingSpinner, EmptyState } from "@/components/ui";

interface Expense {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  date: string;
  linkedBatch: { name: string } | null;
}

const CATEGORIES = [
  { value: "TRANSPORT", label: "Transport" },
  { value: "RENT", label: "Rent" },
  { value: "LABOR", label: "Labor" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "MARKETING", label: "Marketing" },
  { value: "OTHER", label: "Other" },
];

const categoryColors: Record<string, string> = {
  TRANSPORT: "#3b82f6",
  RENT: "#f59e0b",
  LABOR: "#10b981",
  PACKAGING: "#a855f7",
  UTILITIES: "#06b6d4",
  MARKETING: "#ec4899",
  OTHER: "#6b7280",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState({ category: "OTHER", description: "", amount: "" });

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    try {
      const res = await fetch("/api/expenses");
      const json = await res.json();
      setExpenses(json.expenses || []);
      setTotalExpenses(json.totalExpenses || 0);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowModal(false);
      setForm({ category: "OTHER", description: "", amount: "" });
      fetchExpenses();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    fetchExpenses();
  };

  const filtered = filterCat === "all" ? expenses : expenses.filter((e) => e.category === filterCat);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Expenses"
        description="Track business expenses by category"
        action={<Button onClick={() => setShowModal(true)}><Plus size={16} /> Add Expense</Button>}
      />

      {/* Total Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6"
        style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Receipt size={24} className="text-white/80" />
          <p className="text-sm font-medium text-white/80">Total Expenses</p>
        </div>
        <p className="text-3xl font-bold text-white">{totalExpenses.toLocaleString()}</p>
      </motion.div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterCat("all")}
          className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
          style={{
            background: filterCat === "all" ? "var(--accent-gradient)" : "var(--bg-card)",
            color: filterCat === "all" ? "#fff" : "var(--text-secondary)",
            border: filterCat === "all" ? "none" : "1px solid var(--border-color)",
          }}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilterCat(cat.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
            style={{
              background: filterCat === cat.value ? "var(--accent-gradient)" : "var(--bg-card)",
              color: filterCat === cat.value ? "#fff" : "var(--text-secondary)",
              border: filterCat === cat.value ? "none" : "1px solid var(--border-color)",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Expenses List */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((exp, i) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-4 rounded-xl group"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: categoryColors[exp.category] || "#6b7280" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {exp.category.charAt(0) + exp.category.slice(1).toLowerCase()}
                  {exp.linkedBatch ? ` → ${exp.linkedBatch.name}` : ""}
                </p>
                {exp.description && (
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {exp.description}
                  </p>
                )}
              </div>
              <p className="text-sm font-semibold shrink-0" style={{ color: "var(--danger)" }}>
                -{exp.amount.toLocaleString()}
              </p>
              <p className="text-xs shrink-0 hidden sm:block" style={{ color: "var(--text-muted)" }}>
                {new Date(exp.date).toLocaleDateString()}
              </p>
              <button
                onClick={() => handleDelete(exp.id)}
                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                style={{ color: "var(--danger)" }}
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Receipt size={24} style={{ color: "var(--text-muted)" }} />}
          title="No expenses"
          description="Add your first expense to start tracking."
          action={<Button onClick={() => setShowModal(true)}><Plus size={16} /> Add Expense</Button>}
        />
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
              {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Amount</label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" required min="1" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Description (optional)</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Fuel for delivery" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
          </div>
          <Button type="submit" loading={saving} className="w-full">Save Expense</Button>
        </form>
      </Modal>
    </div>
  );
}

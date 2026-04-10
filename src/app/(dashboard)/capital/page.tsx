"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Plus, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { Button, LoadingSpinner } from "@/components/ui";
import { useBusinessContext } from "@/contexts/BusinessContext";

interface CapitalEntry {
  id: string;
  amount: number;
  type: string;
  note: string | null;
  date: string;
}

export default function CapitalPage() {
  const [entries, setEntries] = useState<CapitalEntry[]>([]);
  const [totalCapital, setTotalCapital] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ amount: "", type: "ADDED", note: "" });
  const [saving, setSaving] = useState(false);
  const { businessType } = useBusinessContext();
  const isWine = businessType === "WINE";

  useEffect(() => { fetchCapital(); }, []);

  const fetchCapital = async () => {
    try {
      const res = await fetch("/api/capital");
      const json = await res.json();
      setEntries(json.entries || []);
      setTotalCapital(json.totalCapital || 0);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/capital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowModal(false);
      setForm({ amount: "", type: "ADDED", note: "" });
      fetchCapital();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Capital Management"
        description={isWine ? "Track your business capital — additions only" : "Track your business capital — additions and withdrawals"}
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Entry
          </Button>
        }
      />

      {/* Wine Capital Warning */}
      {isWine && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-xl"
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
          }}
        >
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" style={{ color: "#f59e0b" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "#f59e0b" }}>
              Capital is irreversible
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              For wine businesses, capital can only be topped up, never withdrawn. Please double-check amounts before adding.
            </p>
          </div>
        </motion.div>
      )}

      {/* Total Capital Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 glow-card"
        style={{ background: "var(--accent-gradient)" }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Wallet size={24} className="text-white/80" />
          <p className="text-sm font-medium text-white/80">Total Capital</p>
        </div>
        <p className="text-3xl font-bold text-white">
          {totalCapital.toLocaleString()}
        </p>
      </motion.div>

      {/* Entries */}
      <div className="space-y-2">
        {entries.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: entry.type === "WITHDRAWN" ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
              }}
            >
              {entry.type === "WITHDRAWN" ? (
                <ArrowDownCircle size={20} style={{ color: "var(--danger)" }} />
              ) : (
                <ArrowUpCircle size={20} style={{ color: "var(--success)" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {entry.type === "INITIAL" ? "Initial Capital" : entry.type === "ADDED" ? "Capital Added" : "Capital Withdrawn"}
              </p>
              {entry.note && (
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                  {entry.note}
                </p>
              )}
            </div>
            <div className="text-right">
              <p
                className="text-sm font-semibold"
                style={{ color: entry.type === "WITHDRAWN" ? "var(--danger)" : "var(--success)" }}
              >
                {entry.type === "WITHDRAWN" ? "-" : "+"}{entry.amount.toLocaleString()}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {new Date(entry.date).toLocaleDateString()}
              </p>
            </div>
          </motion.div>
        ))}

        {entries.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No capital entries yet. Add your first entry.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Capital Entry">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            >
              <option value="ADDED">Add Capital</option>
              {!isWine && <option value="WITHDRAWN">Withdraw Capital</option>}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Amount
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0"
              required
              min="1"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Note (optional)
            </label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="e.g. Investor contribution"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            />
          </div>

          <Button type="submit" loading={saving} className="w-full">
            Save Entry
          </Button>
        </form>
      </Modal>
    </div>
  );
}

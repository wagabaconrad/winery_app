"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, Plus, Edit3, Trash2, Search, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { Button, LoadingSpinner, EmptyState } from "@/components/ui";

interface StockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalValue: number;
  sourceBatch?: { id: string; name: string } | null;
}

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ name: "", category: "RAW", quantity: "", unit: "kg", unitCost: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchStock(); }, []);

  const fetchStock = async () => {
    try {
      const res = await fetch("/api/stock");
      const json = await res.json();
      setItems(Array.isArray(json) ? json : []);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await fetch("/api/stock", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...form }),
        });
      } else {
        await fetch("/api/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      closeModal();
      fetchStock();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this stock item?")) return;
    await fetch(`/api/stock?id=${id}`, { method: "DELETE" });
    fetchStock();
  };

  const cleanupLegacyFinished = async () => {
    if (!confirm("Remove all legacy (unlinked) finished goods? These are leftover items from before batches tracked their own inventory. This cannot be undone.")) return;
    await fetch(`/api/stock?cleanupLegacy=true`, { method: "DELETE" });
    fetchStock();
  };

  const legacyCount = items.filter((i) => i.category === "FINISHED" && !i.sourceBatch).length;

  const openEdit = (item: StockItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      unit: item.unit,
      unitCost: String(item.unitCost),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm({ name: "", category: "RAW", quantity: "", unit: "kg", unitCost: "" });
  };

  const filtered = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || item.category === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Inventory"
        description="Manage raw materials and finished goods"
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Item
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
          />
        </div>
        <div className="flex gap-2">
          {["all", "RAW", "FINISHED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: filter === f ? "var(--accent-gradient)" : "var(--bg-card)",
                color: filter === f ? "#fff" : "var(--text-secondary)",
                border: filter === f ? "none" : "1px solid var(--border-color)",
              }}
            >
              {f === "all" ? "All" : f === "RAW" ? "Raw Materials" : "Finished Goods"}
            </button>
          ))}
        </div>
      </div>

      {/* Legacy finished goods warning */}
      {legacyCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <AlertTriangle size={18} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "#f59e0b" }}>
              {legacyCount} legacy finished good{legacyCount === 1 ? "" : "s"} detected
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              These items were created before batches tracked their own inventory and aren&apos;t linked to any batch. Clean them up to keep each batch&apos;s products isolated.
            </p>
          </div>
          <button
            onClick={cleanupLegacyFinished}
            className="px-3 py-2 rounded-lg text-xs font-medium shrink-0"
            style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
          >
            Clean up
          </button>
        </div>
      )}

      {/* Inventory Value Summary */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Total Inventory Value", value: items.reduce((s, i) => s + i.totalValue, 0), color: "var(--accent-secondary)" },
            { label: "Raw Materials Value", value: items.filter(i => i.category === "RAW").reduce((s, i) => s + i.totalValue, 0), color: "#3b82f6" },
            { label: "Finished Goods Value", value: items.filter(i => i.category === "FINISHED").reduce((s, i) => s + i.totalValue, 0), color: "#10b981" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
              <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Items */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl p-4 group"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {item.name}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: item.category === "RAW" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)",
                        color: item.category === "RAW" ? "#3b82f6" : "#10b981",
                      }}
                    >
                      {item.category === "RAW" ? "Raw Material" : "Finished Good"}
                    </span>
                    {item.category === "FINISHED" && item.quantity <= 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                        SOLD OUT
                      </span>
                    )}
                  </div>
                  {item.category === "FINISHED" && (
                    <div className="mt-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                      <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: "#a78bfa" }}>
                        From Batch
                      </p>
                      <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {item.sourceBatch?.name || "Legacy (unlinked)"}
                      </p>
                    </div>
                  )}
                </div>
                {/* Only raw materials are manually editable; finished goods are fully managed by batch production + sales */}
                {item.category === "RAW" && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg" style={{ color: "var(--danger)" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Qty</p>
                  <p className="text-sm font-semibold" style={{ color: item.quantity <= 5 ? "var(--danger)" : "var(--text-primary)" }}>
                    {item.quantity} {item.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Unit Cost</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {item.unitCost.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Value</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--accent-secondary)" }}>
                    {item.totalValue.toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Package size={24} style={{ color: "var(--text-muted)" }} />}
          title="No stock items"
          description="Add your first raw material or finished good to get started."
          action={
            <Button onClick={() => setShowModal(true)}>
              <Plus size={16} /> Add Item
            </Button>
          }
        />
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editing ? "Edit Stock Item" : "Add Stock Item"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Name</label>
            <input
              type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Grapes, Wine Bottles" required
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Category</label>
              <select
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
              >
                <option value="RAW">Raw Material</option>
              </select>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Finished goods are auto-created from production batches
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Unit</label>
              <select
                value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
              >
                <option value="kg">Kilograms</option>
                <option value="g">Grams</option>
                <option value="liters">Liters</option>
                <option value="bottles">Bottles</option>
                <option value="jerrycans">Jerrycans</option>
                <option value="cans">Cans</option>
                <option value="units">Units</option>
                <option value="packs">Packs</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Quantity</label>
              <input
                type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="0" min="0" step="any" required
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Unit Cost</label>
              <input
                type="number" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                placeholder="0" min="0" step="any" required
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <Button type="submit" loading={saving} className="w-full">
            {editing ? "Update Item" : "Add Item"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

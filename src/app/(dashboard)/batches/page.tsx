"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Plus, ChevronDown, ChevronUp } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { Button, LoadingSpinner, EmptyState } from "@/components/ui";

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  category: string;
}

interface MaterialUsage {
  id: string;
  quantityUsed: number;
  cost: number;
  stockItem: { name: string; unit: string };
}

interface Batch {
  id: string;
  name: string;
  totalCost: number;
  outputQuantity: number;
  costPerUnit: number;
  status: string;
  createdAt: string;
  materials: MaterialUsage[];
  expenses: { id: string; category: string; amount: number; description: string | null }[];
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    outputQuantity: "",
    materials: [{ stockItemId: "", quantityUsed: "", unitCost: "" }],
    expenses: [{ category: "LABOR", amount: "", description: "" }],
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/batches").then((r) => r.json()),
      fetch("/api/stock").then((r) => r.json()),
    ]).then(([b, s]) => {
      setBatches(b);
      setStock(s.filter ? s.filter((i: StockItem) => i.category === "RAW") : []);
      setLoading(false);
    });
  }, []);

  const addMaterial = () => {
    setForm({ ...form, materials: [...form.materials, { stockItemId: "", quantityUsed: "", unitCost: "" }] });
  };

  const addExpense = () => {
    setForm({ ...form, expenses: [...form.expenses, { category: "OTHER", amount: "", description: "" }] });
  };

  const updateMaterial = (index: number, field: string, value: string) => {
    const mats = [...form.materials];
    (mats[index] as Record<string, string>)[field] = value;

    // Auto-fill unit cost from stock
    if (field === "stockItemId") {
      const item = stock.find((s) => s.id === value);
      if (item) mats[index].unitCost = String(item.unitCost);
    }

    setForm({ ...form, materials: mats });
  };

  const updateExpense = (index: number, field: string, value: string) => {
    const exps = [...form.expenses];
    (exps[index] as Record<string, string>)[field] = value;
    setForm({ ...form, expenses: exps });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const validMaterials = form.materials.filter((m) => m.stockItemId && m.quantityUsed);
      const validExpenses = form.expenses.filter((e) => e.amount);

      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          outputQuantity: form.outputQuantity,
          materials: validMaterials,
          expenses: validExpenses,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setForm({
          name: "", outputQuantity: "",
          materials: [{ stockItemId: "", quantityUsed: "", unitCost: "" }],
          expenses: [{ category: "LABOR", amount: "", description: "" }],
        });
        const updated = await fetch("/api/batches").then((r) => r.json());
        setBatches(updated);
        // Refresh stock
        const updatedStock = await fetch("/api/stock").then((r) => r.json());
        setStock(updatedStock.filter ? updatedStock.filter((i: StockItem) => i.category === "RAW") : []);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create batch");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Production Batches"
        description="Create production batches, track costs, and manage output"
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Batch
          </Button>
        }
      />

      {batches.length > 0 ? (
        <div className="space-y-3">
          {batches.map((batch, i) => (
            <motion.div
              key={batch.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
            >
              <button
                onClick={() => setExpanded(expanded === batch.id ? null : batch.id)}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(168,85,247,0.1)" }}
                >
                  <FlaskConical size={20} style={{ color: "var(--accent-secondary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {batch.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(batch.createdAt).toLocaleDateString()} • {batch.outputQuantity} units
                  </p>
                </div>
                <div className="text-right mr-2">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Cost: {batch.totalCost.toLocaleString()}
                  </p>
                  <p className="text-xs" style={{ color: "var(--accent-secondary)" }}>
                    {batch.costPerUnit.toLocaleString()}/unit
                  </p>
                </div>
                {expanded === batch.id ? <ChevronUp size={18} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={18} style={{ color: "var(--text-muted)" }} />}
              </button>

              {expanded === batch.id && (
                <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border-color)" }}>
                  <div className="pt-3">
                    <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Raw Materials Used</p>
                    {batch.materials.map((m) => (
                      <div key={m.id} className="flex justify-between py-1.5 text-xs" style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <span style={{ color: "var(--text-primary)" }}>{m.stockItem.name}</span>
                        <span style={{ color: "var(--text-muted)" }}>
                          {m.quantityUsed} {m.stockItem.unit} × {(m.cost / m.quantityUsed).toLocaleString()} = {m.cost.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  {batch.expenses.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Linked Expenses</p>
                      {batch.expenses.map((exp) => (
                        <div key={exp.id} className="flex justify-between py-1.5 text-xs" style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <span style={{ color: "var(--text-primary)" }}>{exp.category}{exp.description ? ` — ${exp.description}` : ""}</span>
                          <span style={{ color: "var(--text-muted)" }}>{exp.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FlaskConical size={24} style={{ color: "var(--text-muted)" }} />}
          title="No production batches"
          description="Create your first batch to start tracking production costs."
          action={<Button onClick={() => setShowModal(true)}><Plus size={16} /> New Batch</Button>}
        />
      )}

      {/* Create Batch Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Production Batch" maxWidth="600px">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Batch Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Wine Batch A" required className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Output Quantity</label>
              <input type="number" value={form.outputQuantity} onChange={(e) => setForm({ ...form, outputQuantity: e.target.value })} placeholder="e.g. 100 bottles" required min="1" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            </div>
          </div>

          {/* Materials */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Raw Materials</p>
              <button type="button" onClick={addMaterial} className="text-xs font-medium" style={{ color: "var(--accent-secondary)" }}>+ Add Material</button>
            </div>
            {form.materials.map((mat, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                <select value={mat.stockItemId} onChange={(e) => updateMaterial(idx, "stockItemId", e.target.value)} className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                  <option value="">Select material</option>
                  {stock.map((s) => (<option key={s.id} value={s.id}>{s.name} ({s.quantity} {s.unit})</option>))}
                </select>
                <input type="number" value={mat.quantityUsed} onChange={(e) => updateMaterial(idx, "quantityUsed", e.target.value)} placeholder="Qty used" min="0" step="any" className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                <input type="number" value={mat.unitCost} onChange={(e) => updateMaterial(idx, "unitCost", e.target.value)} placeholder="Unit cost" min="0" step="any" className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
            ))}
          </div>

          {/* Expenses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Batch Expenses (Labor, Packaging, etc.)</p>
              <button type="button" onClick={addExpense} className="text-xs font-medium" style={{ color: "var(--accent-secondary)" }}>+ Add Expense</button>
            </div>
            {form.expenses.map((exp, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                <select value={exp.category} onChange={(e) => updateExpense(idx, "category", e.target.value)} className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                  <option value="LABOR">Labor</option>
                  <option value="PACKAGING">Packaging</option>
                  <option value="TRANSPORT">Transport</option>
                  <option value="UTILITIES">Utilities</option>
                  <option value="OTHER">Other</option>
                </select>
                <input type="number" value={exp.amount} onChange={(e) => updateExpense(idx, "amount", e.target.value)} placeholder="Amount" min="0" className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                <input type="text" value={exp.description} onChange={(e) => updateExpense(idx, "description", e.target.value)} placeholder="Note" className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
            ))}
          </div>

          <Button type="submit" loading={saving} className="w-full">
            Create Batch
          </Button>
        </form>
      </Modal>
    </div>
  );
}

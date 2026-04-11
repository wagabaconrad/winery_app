"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Plus, ChevronDown, ChevronUp, Search, X, Package, Edit3, Trash2 } from "lucide-react";
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

interface FinishedGood {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

interface Batch {
  id: string;
  name: string;
  totalCost: number;
  outputQuantity: number;
  costPerUnit: number;
  bottleCount: number | null;
  jerrycanCount: number | null;
  canCount: number | null;
  status: string;
  createdAt: string;
  materials: MaterialUsage[];
  expenses: { id: string; category: string; amount: number; description: string | null }[];
  finishedGoods: FinishedGood[];
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Inventory picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerFilter, setPickerFilter] = useState<"ALL" | "RAW" | "FINISHED">("ALL");

  const [form, setForm] = useState({
    name: "",
    outputQuantity: "",
    bottleCount: "",
    jerrycanCount: "",
    canCount: "",
    materials: [{ stockItemId: "", stockItemName: "", stockItemUnit: "", quantityUsed: "", unitCost: "" }],
    expenses: [{ category: "LABOR", amount: "", description: "" }],
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/batches").then((r) => r.json()),
      fetch("/api/stock").then((r) => r.json()),
    ]).then(([b, s]) => {
      setBatches(b);
      setStock(Array.isArray(s) ? s : []);
      setLoading(false);
    });
  }, []);

  const openPicker = (index: number) => {
    setPickerIndex(index);
    setPickerSearch("");
    setPickerFilter("ALL");
    setShowPicker(true);
  };

  const selectStockItem = (item: StockItem) => {
    if (pickerIndex === null) return;
    const mats = [...form.materials];
    mats[pickerIndex] = {
      ...mats[pickerIndex],
      stockItemId: item.id,
      stockItemName: item.name,
      stockItemUnit: item.unit,
      unitCost: String(item.unitCost),
    };
    setForm({ ...form, materials: mats });
    setShowPicker(false);
    setPickerIndex(null);
  };

  const clearMaterial = (index: number) => {
    const mats = [...form.materials];
    mats[index] = { ...mats[index], stockItemId: "", stockItemName: "", stockItemUnit: "", unitCost: "" };
    setForm({ ...form, materials: mats });
  };

  const addMaterial = () => {
    setForm({ ...form, materials: [...form.materials, { stockItemId: "", stockItemName: "", stockItemUnit: "", quantityUsed: "", unitCost: "" }] });
  };

  const removeMaterial = (index: number) => {
    if (form.materials.length <= 1) return;
    setForm({ ...form, materials: form.materials.filter((_, i) => i !== index) });
  };

  const addExpense = () => {
    setForm({ ...form, expenses: [...form.expenses, { category: "OTHER", amount: "", description: "" }] });
  };

  const updateMaterial = (index: number, field: string, value: string) => {
    const mats = [...form.materials];
    (mats[index] as Record<string, string>)[field] = value;
    setForm({ ...form, materials: mats });
  };

  const updateExpense = (index: number, field: string, value: string) => {
    const exps = [...form.expenses];
    (exps[index] as Record<string, string>)[field] = value;
    setForm({ ...form, expenses: exps });
  };

  const openEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setForm({
      name: batch.name,
      outputQuantity: String(batch.outputQuantity),
      bottleCount: batch.bottleCount ? String(batch.bottleCount) : "",
      jerrycanCount: batch.jerrycanCount ? String(batch.jerrycanCount) : "",
      canCount: batch.canCount ? String(batch.canCount) : "",
      materials: batch.materials.length > 0
        ? batch.materials.map((m) => ({
            stockItemId: "",
            stockItemName: m.stockItem.name,
            stockItemUnit: m.stockItem.unit,
            quantityUsed: String(m.quantityUsed),
            unitCost: String((m.cost / m.quantityUsed).toFixed(2)),
          }))
        : [{ stockItemId: "", stockItemName: "", stockItemUnit: "", quantityUsed: "", unitCost: "" }],
      expenses: [{ category: "LABOR", amount: "", description: "" }],
    });
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/batches?id=${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setBatches(batches.filter((b) => b.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete batch");
      }
    } finally {
      setDeleting(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBatch(null);
    setForm({
      name: "", outputQuantity: "", bottleCount: "", jerrycanCount: "", canCount: "",
      materials: [{ stockItemId: "", stockItemName: "", stockItemUnit: "", quantityUsed: "", unitCost: "" }],
      expenses: [{ category: "LABOR", amount: "", description: "" }],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let res: Response;

      if (editingBatch) {
        // Edit: only update name, outputQuantity, product form counts
        res = await fetch("/api/batches", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingBatch.id,
            name: form.name,
            outputQuantity: form.outputQuantity,
            bottleCount: form.bottleCount,
            jerrycanCount: form.jerrycanCount,
            canCount: form.canCount,
          }),
        });
      } else {
        const validMaterials = form.materials
          .filter((m) => m.stockItemId && m.quantityUsed)
          .map((m) => ({ stockItemId: m.stockItemId, quantityUsed: m.quantityUsed, unitCost: m.unitCost }));
        const validExpenses = form.expenses.filter((e) => e.amount);

        res = await fetch("/api/batches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            outputQuantity: form.outputQuantity,
            bottleCount: form.bottleCount,
            jerrycanCount: form.jerrycanCount,
            canCount: form.canCount,
            materials: validMaterials,
            expenses: validExpenses,
          }),
        });
      }

      if (res.ok) {
        closeModal();
        const [updated, updatedStock] = await Promise.all([
          fetch("/api/batches").then((r) => r.json()),
          fetch("/api/stock").then((r) => r.json()),
        ]);
        setBatches(updated);
        setStock(Array.isArray(updatedStock) ? updatedStock : []);
      } else {
        const err = await res.json();
        alert(err.error || (editingBatch ? "Failed to update batch" : "Failed to create batch"));
      }
    } finally {
      setSaving(false);
    }
  };

  // Inputs picker only shows RAW materials — finished goods come from batch creation only
  const filteredPickerItems = stock.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(pickerSearch.toLowerCase());
    return s.category === "RAW" && matchesSearch;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Production Batches"
        description="Create production batches, track costs, and manage output"
        action={
          <Button onClick={() => { setEditingBatch(null); setShowModal(true); }}>
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
              <div className="flex items-center gap-4 p-4">
                <button
                  onClick={() => setExpanded(expanded === batch.id ? null : batch.id)}
                  className="flex items-center gap-4 flex-1 min-w-0 text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(168,85,247,0.1)" }}>
                    <FlaskConical size={20} style={{ color: "var(--accent-secondary)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{batch.name}</p>
                      {batch.status === "completed" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>Completed</span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(batch.createdAt).toLocaleDateString()} • {batch.outputQuantity} units
                    </p>
                  </div>
                  <div className="text-right mr-2">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Cost: {batch.totalCost.toLocaleString()}</p>
                    <p className="text-xs" style={{ color: "var(--accent-secondary)" }}>{batch.costPerUnit.toLocaleString()}/unit</p>
                  </div>
                  {expanded === batch.id ? <ChevronUp size={18} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={18} style={{ color: "var(--text-muted)" }} />}
                </button>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(batch); }}
                    className="p-2 rounded-lg"
                    style={{ color: "var(--text-muted)" }}
                    title="Edit batch"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: batch.id, name: batch.name }); }}
                    className="p-2 rounded-lg"
                    style={{ color: "var(--danger)" }}
                    title="Delete batch"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {expanded === batch.id && (
                <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border-color)" }}>
                  {(batch.bottleCount || batch.jerrycanCount || batch.canCount) && (
                    <div className="pt-3">
                      <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Product Forms</p>
                      <div className="flex gap-3">
                        {batch.bottleCount && batch.bottleCount > 0 && (
                          <div className="px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa" }}>{batch.bottleCount} Bottles</div>
                        )}
                        {batch.jerrycanCount && batch.jerrycanCount > 0 && (
                          <div className="px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(59,130,246,0.1)", color: "#93c5fd" }}>{batch.jerrycanCount} Jerrycans</div>
                        )}
                        {batch.canCount && batch.canCount > 0 && (
                          <div className="px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(16,185,129,0.1)", color: "#6ee7b7" }}>{batch.canCount} Cans</div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Finished Goods produced by this batch */}
                  {batch.finishedGoods && batch.finishedGoods.length > 0 && (
                    <div className="pt-3">
                      <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Finished Goods</p>
                      {batch.finishedGoods.map((g) => {
                        const soldOut = g.quantity <= 0;
                        return (
                          <div key={g.id} className="flex items-center justify-between py-1.5 text-xs" style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <div className="flex items-center gap-2">
                              <span style={{ color: "var(--text-primary)" }}>{g.name}</span>
                              {soldOut && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>SOLD OUT</span>
                              )}
                            </div>
                            <span style={{ color: soldOut ? "#ef4444" : "var(--text-muted)" }}>
                              {g.quantity} {g.unit} remaining
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-3">
                    <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Inputs Used</p>
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
          action={<Button onClick={() => { setEditingBatch(null); setShowModal(true); }}><Plus size={16} /> New Batch</Button>}
        />
      )}

      {/* Create / Edit Batch Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editingBatch ? "Edit Batch" : "Create Production Batch"} maxWidth="600px">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Batch Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Wine Batch A" required className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Output Quantity</label>
              <input type="number" value={form.outputQuantity} onChange={(e) => setForm({ ...form, outputQuantity: e.target.value })} placeholder="e.g. 100" required min="1" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            </div>
          </div>

          {editingBatch && (
            <div className="px-4 py-3 rounded-xl text-xs" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>
              Editing batch details only. Materials and expenses cannot be changed after creation.
            </div>
          )}

          {/* Finished Goods Output */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <div>
              <p className="text-xs font-medium" style={{ color: "#10b981" }}>Finished Goods Output</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>How many bottles, jerrycans, or cans this batch produces — added to inventory automatically.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="block text-[10px]" style={{ color: "var(--text-muted)" }}>Bottles</label>
                <input type="number" value={form.bottleCount} onChange={(e) => setForm({ ...form, bottleCount: e.target.value })} placeholder="0" min="0" className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px]" style={{ color: "var(--text-muted)" }}>Jerrycans</label>
                <input type="number" value={form.jerrycanCount} onChange={(e) => setForm({ ...form, jerrycanCount: e.target.value })} placeholder="0" min="0" className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px]" style={{ color: "var(--text-muted)" }}>Cans</label>
                <input type="number" value={form.canCount} onChange={(e) => setForm({ ...form, canCount: e.target.value })} placeholder="0" min="0" className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
            </div>
          </div>

          {/* Inputs / Materials — only shown when creating */}
          {!editingBatch && (<div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Inputs Used (from Inventory)</p>
              <button type="button" onClick={addMaterial} className="text-xs font-medium" style={{ color: "var(--accent-secondary)" }}>+ Add Row</button>
            </div>
            {form.materials.map((mat, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-center">
                {/* Item picker button */}
                <button
                  type="button"
                  onClick={() => openPicker(idx)}
                  className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: mat.stockItemName ? "var(--text-primary)" : "var(--text-muted)", minWidth: 0 }}
                >
                  <Package size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  <span className="truncate">{mat.stockItemName || "Select from inventory…"}</span>
                </button>
                {/* Qty */}
                <input
                  type="number"
                  value={mat.quantityUsed}
                  onChange={(e) => updateMaterial(idx, "quantityUsed", e.target.value)}
                  placeholder="Qty"
                  min="0"
                  step="any"
                  className="w-20 px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                />
                {/* Unit cost */}
                <input
                  type="number"
                  value={mat.unitCost}
                  onChange={(e) => updateMaterial(idx, "unitCost", e.target.value)}
                  placeholder="Cost"
                  min="0"
                  step="any"
                  className="w-24 px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                />
                {/* Clear / remove */}
                <button
                  type="button"
                  onClick={() => mat.stockItemId ? clearMaterial(idx) : removeMaterial(idx)}
                  className="p-1.5 rounded-lg shrink-0"
                  style={{ color: "var(--danger)" }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Click the item button to pick from your inventory. Leave rows empty to skip.</p>
          </div>)}

          {/* Expenses — only shown when creating */}
          {!editingBatch && (
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
          )}

          <Button type="submit" loading={saving} className="w-full">{editingBatch ? "Save Changes" : "Create Batch"}</Button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Batch" maxWidth="400px">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Are you sure you want to delete <span className="font-semibold" style={{ color: "var(--text-primary)" }}>&ldquo;{deleteTarget?.name}&rdquo;</span>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
            >
              Cancel
            </button>
            <Button onClick={confirmDelete} loading={deleting} className="flex-1" style={{ background: "var(--danger)" }}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Inventory Picker Popup */}
      <Modal isOpen={showPicker} onClose={() => setShowPicker(false)} title="Select Inventory Item" maxWidth="480px">
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search inventory…"
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            />
          </div>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Showing raw materials only — finished goods are created automatically from batch output.</p>

          {/* Items list */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {filteredPickerItems.length === 0 ? (
              <p className="text-center text-sm py-8" style={{ color: "var(--text-muted)" }}>
                {stock.length === 0 ? "No inventory items yet. Add some in the Inventory page first." : "No items match your search."}
              </p>
            ) : (
              filteredPickerItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectStockItem(item)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {item.quantity} {item.unit} in stock • Cost: {item.unitCost.toLocaleString()}/{item.unit}
                    </p>
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full ml-3 shrink-0"
                    style={{
                      background: item.category === "RAW" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)",
                      color: item.category === "RAW" ? "#3b82f6" : "#10b981",
                    }}
                  >
                    {item.category === "RAW" ? "Raw" : "Finished"}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

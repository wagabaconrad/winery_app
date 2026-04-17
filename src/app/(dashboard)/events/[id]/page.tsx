"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  Edit3,
  DollarSign,
} from "lucide-react";
import { Button, LoadingSpinner } from "@/components/ui";
import Modal from "@/components/Modal";

interface EventItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

interface EventInvoice {
  id: string;
  invoiceNumber: string;
  budgetAmount: number;
  totalCost: number;
  createdAt: string;
}

interface EventDetail {
  id: string;
  eventType: string;
  name: string;
  status: string;
  customerBudget: number;
  totalCost: number;
  plateCost: number;
  plateCount: number;
  eventDate: string | null;
  notes: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null; email: string | null } | null;
  items: EventItem[];
  invoices: EventInvoice[];
}

interface Customer {
  id: string;
  name: string;
}

const eventTypeLabels: Record<string, string> = {
  WEDDING: "Wedding", BIRTHDAY: "Birthday", CORPORATE: "Corporate",
  PARTY: "Party", FUNERAL: "Funeral", OTHER: "Other",
};

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
  CONFIRMED: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  COMPLETED: { bg: "rgba(16,185,129,0.15)", text: "#34d399" },
  CANCELLED: { bg: "rgba(239,68,68,0.15)", text: "#f87171" },
};

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newBudget, setNewBudget] = useState("");

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    eventType: "WEDDING",
    name: "",
    customerId: "",
    eventDate: "",
    customerBudget: "",
    plateCount: "",
    notes: "",
    items: [{ name: "", quantity: "", unit: "kg", unitCost: "" }],
  });

  useEffect(() => {
    Promise.all([
      fetchEvent(),
      fetch("/api/customers").then((r) => r.json()).then((c) => setCustomers(Array.isArray(c) ? c : [])),
    ]);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/events/${id}`);
      if (res.ok) {
        setEvent(await res.json());
      } else {
        router.push("/events");
      }
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (ev: EventDetail) => {
    setEditForm({
      eventType: ev.eventType,
      name: ev.name,
      customerId: ev.customer?.id || "",
      eventDate: ev.eventDate ? ev.eventDate.split("T")[0] : "",
      customerBudget: String(ev.customerBudget),
      plateCount: String(ev.plateCount),
      notes: ev.notes || "",
      items: ev.items.length > 0
        ? ev.items.map((i) => ({
            name: i.name,
            quantity: String(i.quantity),
            unit: i.unit,
            unitCost: String(i.unitCost),
          }))
        : [{ name: "", quantity: "", unit: "kg", unitCost: "" }],
    });
    setShowEditModal(true);
  };

  const addEditItem = () => {
    setEditForm({ ...editForm, items: [...editForm.items, { name: "", quantity: "", unit: "kg", unitCost: "" }] });
  };

  const updateEditItem = (idx: number, field: string, value: string) => {
    const items = [...editForm.items];
    (items[idx] as Record<string, string>)[field] = value;
    setEditForm({ ...editForm, items });
  };

  const removeEditItem = (idx: number) => {
    if (editForm.items.length <= 1) return;
    setEditForm({ ...editForm, items: editForm.items.filter((_, i) => i !== idx) });
  };

  const editTotalCost = editForm.items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0);
  }, 0);
  const editBudgetRemaining = (parseFloat(editForm.customerBudget) || 0) - editTotalCost;

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const validItems = editForm.items.filter((i) => i.name && i.quantity);
      const res = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: editForm.eventType,
          name: editForm.name,
          customerId: editForm.customerId || null,
          eventDate: editForm.eventDate || null,
          customerBudget: editForm.customerBudget,
          plateCount: editForm.plateCount,
          notes: editForm.notes || null,
          items: validItems,
        }),
      });
      if (res.ok) {
        await fetchEvent();
        setShowEditModal(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update event");
      }
    } finally {
      setEditSaving(false);
    }
  };

  const handleAction = async (action: "confirm" | "complete" | "cancel") => {
    setActing(true);
    try {
      const res = await fetch(`/api/events/${id}/${action}`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setEvent(updated);
        setShowConfirmDialog(false);
      } else {
        const err = await res.json();
        alert(err.error || `Failed to ${action} event`);
      }
    } finally {
      setActing(false);
    }
  };

  const handleBudgetUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActing(true);
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerBudget: newBudget }),
      });
      if (res.ok) {
        await fetchEvent();
        setShowBudgetModal(false);
        setNewBudget("");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update budget");
      }
    } finally {
      setActing(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!event) return null;

  const sc = statusColors[event.status] || statusColors.DRAFT;
  const profit = event.customerBudget - event.totalCost;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/events")}
          className="p-2 rounded-xl transition-colors"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          <ArrowLeft size={18} style={{ color: "var(--text-muted)" }} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{event.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: "rgba(168,85,247,0.1)", color: "#a78bfa" }}>
              {eventTypeLabels[event.eventType] || event.eventType}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: sc.bg, color: sc.text }}>
              {event.status}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {event.status === "DRAFT" && (
            <>
              <Button onClick={() => openEditModal(event)} variant="secondary" size="sm">
                <Edit3 size={14} /> Edit
              </Button>
              <Button onClick={() => setShowConfirmDialog(true)} size="sm">
                <CheckCircle2 size={14} /> Confirm This Job
              </Button>
              <Button onClick={() => handleAction("cancel")} variant="danger" size="sm" loading={acting}>
                <XCircle size={14} /> Cancel
              </Button>
            </>
          )}
          {event.status === "CONFIRMED" && (
            <>
              <Button onClick={() => { setNewBudget(String(event.customerBudget)); setShowBudgetModal(true); }} variant="secondary" size="sm">
                <DollarSign size={14} /> Edit Budget
              </Button>
              <Button onClick={() => handleAction("complete")} size="sm" loading={acting}>
                <CheckCircle2 size={14} /> Mark Complete
              </Button>
              <Button onClick={() => handleAction("cancel")} variant="danger" size="sm" loading={acting}>
                <XCircle size={14} /> Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Customer Budget</p>
          <p className="text-lg font-bold" style={{ color: "var(--success)" }}>{event.customerBudget.toLocaleString()}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Cost</p>
          <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{event.totalCost.toLocaleString()}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Profit / Loss</p>
          <p className="text-lg font-bold" style={{ color: profit >= 0 ? "var(--success)" : "var(--danger)" }}>{profit.toLocaleString()}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Cost per Plate</p>
          <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {event.plateCount > 0 ? (event.totalCost / event.plateCount).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{event.plateCount} plates</p>
        </motion.div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Event Details */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Event Details</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Customer</span><span className="font-medium" style={{ color: "var(--text-primary)" }}>{event.customer?.name || "—"}</span></div>
            {event.customer?.phone && <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Phone</span><span style={{ color: "var(--text-primary)" }}>{event.customer.phone}</span></div>}
            <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Event Date</span><span style={{ color: "var(--text-primary)" }}>{event.eventDate ? new Date(event.eventDate).toLocaleDateString() : "TBD"}</span></div>
            <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Created</span><span style={{ color: "var(--text-primary)" }}>{new Date(event.createdAt).toLocaleDateString()}</span></div>
            {event.notes && <div className="pt-2" style={{ borderTop: "1px solid var(--border-color)" }}><p style={{ color: "var(--text-muted)" }}>Notes</p><p className="mt-1" style={{ color: "var(--text-primary)" }}>{event.notes}</p></div>}
          </div>
        </motion.div>

        {/* Items Table */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Items Purchased</h3>
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_0.5fr_0.5fr_0.5fr] gap-2 text-[10px] font-medium pb-1" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)" }}>
              <span>Item</span><span>Qty</span><span>Unit Cost</span><span className="text-right">Total</span>
            </div>
            {event.items.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_0.5fr_0.5fr_0.5fr] gap-2 py-1.5 text-xs" style={{ borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ color: "var(--text-primary)" }}>{item.name}</span>
                <span style={{ color: "var(--text-muted)" }}>{item.quantity} {item.unit}</span>
                <span style={{ color: "var(--text-muted)" }}>{item.unitCost.toLocaleString()}</span>
                <span className="text-right font-medium" style={{ color: "var(--text-primary)" }}>{item.totalCost.toLocaleString()}</span>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_0.5fr_0.5fr_0.5fr] gap-2 pt-2 text-xs font-semibold">
              <span style={{ color: "var(--text-primary)" }}>Total</span>
              <span></span><span></span>
              <span className="text-right" style={{ color: "var(--text-primary)" }}>{event.totalCost.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Invoices */}
      {event.invoices.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Invoice History</h3>
          <div className="space-y-2">
            {event.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                <div className="flex items-center gap-3">
                  <FileText size={16} style={{ color: "var(--accent-secondary)" }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{inv.invoiceNumber}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{new Date(inv.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <p style={{ color: "var(--text-muted)" }}>Budget: {inv.budgetAmount.toLocaleString()}</p>
                  <p style={{ color: "var(--text-muted)" }}>Cost: {inv.totalCost.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Confirm Dialog */}
      <Modal isOpen={showConfirmDialog} onClose={() => setShowConfirmDialog(false)} title="Confirm This Job">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Are you sure you want to confirm this event? This will:
          </p>
          <ul className="text-xs space-y-1" style={{ color: "var(--text-muted)" }}>
            <li>- Generate an invoice ({event.name})</li>
            <li>- Record total cost of {event.totalCost.toLocaleString()} as an expense</li>
            <li>- Lock the event from major edits</li>
          </ul>

          <div className="rounded-lg p-3" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: "var(--text-muted)" }}>Budget</span>
              <span className="font-medium" style={{ color: "var(--success)" }}>{event.customerBudget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: "var(--text-muted)" }}>Total Cost</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{event.totalCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs pt-1" style={{ borderTop: "1px solid var(--border-color)" }}>
              <span style={{ color: "var(--text-muted)" }}>Profit/Loss</span>
              <span className="font-semibold" style={{ color: profit >= 0 ? "var(--success)" : "var(--danger)" }}>{profit.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setShowConfirmDialog(false)} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button onClick={() => handleAction("confirm")} loading={acting} className="flex-1">
              Confirm Job
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Budget Modal */}
      <Modal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} title="Edit Customer Budget">
        <form onSubmit={handleBudgetUpdate} className="space-y-4">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Changing the budget will generate a new invoice revision.
          </p>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>New Budget Amount</label>
            <input
              type="number"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
              placeholder="0"
              required
              min="0"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            />
          </div>
          <Button type="submit" loading={acting} className="w-full">
            Update Budget
          </Button>
        </form>
      </Modal>

      {/* Edit Event Modal (DRAFT only) */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Event" maxWidth="640px">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Event Type</label>
              <select value={editForm.eventType} onChange={(e) => setEditForm({ ...editForm, eventType: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                <option value="WEDDING">Wedding</option>
                <option value="BIRTHDAY">Birthday</option>
                <option value="CORPORATE">Corporate</option>
                <option value="PARTY">Party</option>
                <option value="FUNERAL">Funeral</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Event Name</label>
              <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Customer</label>
              <select value={editForm.customerId} onChange={(e) => setEditForm({ ...editForm, customerId: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                <option value="">Select customer</option>
                {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Event Date</label>
              <input type="date" value={editForm.eventDate} onChange={(e) => setEditForm({ ...editForm, eventDate: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Customer Budget</label>
              <input type="number" value={editForm.customerBudget} onChange={(e) => setEditForm({ ...editForm, customerBudget: e.target.value })} placeholder="0" min="0" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Number of Plates</label>
              <input type="number" value={editForm.plateCount} onChange={(e) => setEditForm({ ...editForm, plateCount: e.target.value })} placeholder="0" min="0" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Items Purchased</p>
              <button type="button" onClick={addEditItem} className="text-xs font-medium" style={{ color: "var(--accent-secondary)" }}>+ Add Item</button>
            </div>
            {editForm.items.map((item, idx) => (
              <div key={idx} className="mb-2">
                {/* Mobile layout */}
                <div className="sm:hidden space-y-1.5">
                  <input type="text" value={item.name} onChange={(e) => updateEditItem(idx, "name", e.target.value)} placeholder="e.g. Chicken" className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                  <div className="flex gap-1.5 items-center">
                    <input type="number" value={item.quantity} onChange={(e) => updateEditItem(idx, "quantity", e.target.value)} placeholder="Qty" min="0" step="any" className="w-1/5 px-2 py-2 rounded-xl text-xs outline-none text-center" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                    <select value={item.unit} onChange={(e) => updateEditItem(idx, "unit", e.target.value)} className="w-1/5 px-1 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                      <option value="kg">kg</option>
                      <option value="pieces">pcs</option>
                      <option value="liters">L</option>
                      <option value="units">units</option>
                      <option value="packs">packs</option>
                    </select>
                    <input type="number" value={item.unitCost} onChange={(e) => updateEditItem(idx, "unitCost", e.target.value)} placeholder="Unit cost" min="0" step="any" className="flex-1 px-2 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                    {editForm.items.length > 1 && (
                      <button type="button" onClick={() => removeEditItem(idx)} className="text-xs px-2 py-2 rounded-lg shrink-0" style={{ color: "var(--danger)" }}>✕</button>
                    )}
                  </div>
                </div>
                {/* Desktop layout */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_0.6fr_0.5fr_0.6fr_auto] gap-2 items-center">
                  <input type="text" value={item.name} onChange={(e) => updateEditItem(idx, "name", e.target.value)} placeholder="e.g. Chicken" className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                  <input type="number" value={item.quantity} onChange={(e) => updateEditItem(idx, "quantity", e.target.value)} placeholder="Qty" min="0" step="any" className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                  <select value={item.unit} onChange={(e) => updateEditItem(idx, "unit", e.target.value)} className="px-2 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                    <option value="kg">kg</option>
                    <option value="pieces">pcs</option>
                    <option value="liters">L</option>
                    <option value="units">units</option>
                    <option value="packs">packs</option>
                  </select>
                  <input type="number" value={item.unitCost} onChange={(e) => updateEditItem(idx, "unitCost", e.target.value)} placeholder="Cost" min="0" step="any" className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                  {editForm.items.length > 1 && (
                    <button type="button" onClick={() => removeEditItem(idx)} className="text-xs px-2 py-2 rounded-lg" style={{ color: "var(--danger)" }}>✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="rounded-xl p-3 space-y-1" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--text-muted)" }}>Total Cost</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{editTotalCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--text-muted)" }}>Budget Remaining</span>
              <span className="font-semibold" style={{ color: editBudgetRemaining >= 0 ? "var(--success)" : "var(--danger)" }}>
                {editBudgetRemaining.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Notes (optional)</label>
            <input type="text" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Additional notes..." className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
          </div>

          <Button type="submit" loading={editSaving} className="w-full">
            Save Changes
          </Button>
        </form>
      </Modal>
    </div>
  );
}

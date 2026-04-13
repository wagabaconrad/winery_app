"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { Button, LoadingSpinner, EmptyState } from "@/components/ui";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface EventData {
  id: string;
  eventType: string;
  name: string;
  status: string;
  customerBudget: number;
  totalCost: number;
  plateCost: number;
  plateCount: number;
  eventDate: string | null;
  createdAt: string;
  customer: { name: string } | null;
  items: { id: string; name: string; quantity: number; unit: string; unitCost: number; totalCost: number }[];
  invoices: { id: string; invoiceNumber: string; createdAt: string }[];
}

const eventTypeLabels: Record<string, string> = {
  WEDDING: "Wedding",
  BIRTHDAY: "Birthday",
  CORPORATE: "Corporate",
  PARTY: "Party",
  FUNERAL: "Funeral",
  OTHER: "Other",
};

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
  CONFIRMED: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  COMPLETED: { bg: "rgba(16,185,129,0.15)", text: "#34d399" },
  CANCELLED: { bg: "rgba(239,68,68,0.15)", text: "#f87171" },
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const router = useRouter();

  const [form, setForm] = useState({
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
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
    ]).then(([e, c]) => {
      setEvents(Array.isArray(e) ? e : []);
      setCustomers(Array.isArray(c) ? c : []);
      setLoading(false);
    });
  }, []);

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { name: "", quantity: "", unit: "kg", unitCost: "" }] });
  };

  const updateItem = (idx: number, field: string, value: string) => {
    const items = [...form.items];
    (items[idx] as Record<string, string>)[field] = value;
    setForm({ ...form, items });
  };

  const removeItem = (idx: number) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const totalCost = form.items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0);
  }, 0);

  const calculatedPlateCost = parseInt(form.plateCount) > 0 ? totalCost / parseInt(form.plateCount) : 0;
  const budgetRemaining = (parseFloat(form.customerBudget) || 0) - totalCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const validItems = form.items.filter((i) => i.name && i.quantity);
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: validItems,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({
          eventType: "WEDDING", name: "", customerId: "", eventDate: "",
          customerBudget: "", plateCount: "", notes: "",
          items: [{ name: "", quantity: "", unit: "kg", unitCost: "" }],
        });
        const updated = await fetch("/api/events").then((r) => r.json());
        setEvents(Array.isArray(updated) ? updated : []);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create event");
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = filter === "ALL" ? events : events.filter((e) => e.status === filter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Events"
        description="Manage catering events — weddings, birthdays, corporate functions"
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Event
          </Button>
        }
      />

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {["ALL", "DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filter === s ? "var(--accent-gradient)" : "var(--bg-card)",
              color: filter === s ? "#fff" : "var(--text-muted)",
              border: filter === s ? "none" : "1px solid var(--border-color)",
            }}
          >
            {s === "ALL" ? `All (${events.length})` : `${s.charAt(0) + s.slice(1).toLowerCase()} (${events.filter((e) => e.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Event Cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((event, i) => {
            const sc = statusColors[event.status] || statusColors.DRAFT;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/events/${event.id}`)}
                className="rounded-xl p-4 cursor-pointer hover:scale-[1.01] transition-transform"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {event.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: "rgba(168,85,247,0.1)", color: "#a78bfa" }}
                      >
                        {eventTypeLabels[event.eventType] || event.eventType}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: sc.bg, color: sc.text }}
                      >
                        {event.status}
                      </span>
                    </div>
                  </div>
                  <CalendarDays size={18} style={{ color: "var(--text-muted)" }} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p style={{ color: "var(--text-muted)" }}>Customer</p>
                    <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                      {event.customer?.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "var(--text-muted)" }}>Event Date</p>
                    <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                      {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : "TBD"}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "var(--text-muted)" }}>Budget</p>
                    <p className="font-medium" style={{ color: "var(--success)" }}>
                      {event.customerBudget.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "var(--text-muted)" }}>Total Cost</p>
                    <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                      {event.totalCost.toLocaleString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays size={24} style={{ color: "var(--text-muted)" }} />}
          title="No events"
          description={filter === "ALL" ? "Create your first event to get started." : `No ${filter.toLowerCase()} events.`}
          action={filter === "ALL" ? <Button onClick={() => setShowModal(true)}><Plus size={16} /> New Event</Button> : undefined}
        />
      )}

      {/* Create Event Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Event" maxWidth="640px">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Event Type</label>
              <select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
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
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John's Wedding" required className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Customer</label>
              <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                <option value="">Select customer</option>
                {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Event Date</label>
              <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Customer Budget</label>
              <input type="number" value={form.customerBudget} onChange={(e) => setForm({ ...form, customerBudget: e.target.value })} placeholder="0" min="0" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Number of Plates</label>
              <input type="number" value={form.plateCount} onChange={(e) => setForm({ ...form, plateCount: e.target.value })} placeholder="0" min="0" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Items Purchased</p>
              <button type="button" onClick={addItem} className="text-xs font-medium" style={{ color: "var(--accent-secondary)" }}>+ Add Item</button>
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} className="mb-2">
                {/* Mobile: name full width, then qty/unit/cost in a row */}
                <div className="sm:hidden space-y-1.5">
                  <input type="text" value={item.name} onChange={(e) => updateItem(idx, "name", e.target.value)} placeholder="e.g. Chicken" className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                  <div className="flex gap-1.5 items-center">
                    <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} placeholder="Qty" min="0" step="any" className="w-1/5 px-2 py-2 rounded-xl text-xs outline-none text-center" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                    <select value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} className="w-1/5 px-1 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                      <option value="kg">kg</option>
                      <option value="pieces">pcs</option>
                      <option value="liters">L</option>
                      <option value="units">units</option>
                      <option value="packs">packs</option>
                    </select>
                    <input type="number" value={item.unitCost} onChange={(e) => updateItem(idx, "unitCost", e.target.value)} placeholder="Unit cost" min="0" step="any" className="flex-1 px-2 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-xs px-2 py-2 rounded-lg shrink-0" style={{ color: "var(--danger)" }}>✕</button>
                    )}
                  </div>
                </div>
                {/* Desktop: original 5-column fraction grid */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_0.6fr_0.5fr_0.6fr_auto] gap-2 items-center">
                  <input type="text" value={item.name} onChange={(e) => updateItem(idx, "name", e.target.value)} placeholder="e.g. Chicken" className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                  <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} placeholder="Qty" min="0" step="any" className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                  <select value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} className="px-2 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                    <option value="kg">kg</option>
                    <option value="pieces">pcs</option>
                    <option value="liters">L</option>
                    <option value="units">units</option>
                    <option value="packs">packs</option>
                  </select>
                  <input type="number" value={item.unitCost} onChange={(e) => updateItem(idx, "unitCost", e.target.value)} placeholder="Cost" min="0" step="any" className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="text-xs px-2 py-2 rounded-lg" style={{ color: "var(--danger)" }}>✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="rounded-xl p-3 space-y-1" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--text-muted)" }}>Total Cost</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{totalCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--text-muted)" }}>Cost per Plate</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{calculatedPlateCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--text-muted)" }}>Budget Remaining</span>
              <span className="font-semibold" style={{ color: budgetRemaining >= 0 ? "var(--success)" : "var(--danger)" }}>
                {budgetRemaining.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Notes (optional)</label>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
          </div>

          <Button type="submit" loading={saving} className="w-full">
            Create Event (Draft)
          </Button>
        </form>
      </Modal>
    </div>
  );
}

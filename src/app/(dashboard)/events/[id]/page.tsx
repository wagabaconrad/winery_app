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
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newBudget, setNewBudget] = useState("");

  useEffect(() => {
    fetchEvent();
  }, [id]);

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
              <Button onClick={() => router.push(`/events`)} variant="secondary" size="sm">
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
    </div>
  );
}

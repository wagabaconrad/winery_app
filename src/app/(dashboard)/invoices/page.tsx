"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Download } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { LoadingSpinner, EmptyState } from "@/components/ui";
import { generateInvoicePDF, InvoiceData } from "@/lib/invoice-pdf";
import { generateEventInvoicePDF, EventInvoiceData } from "@/lib/event-invoice-pdf";
import { useBusinessContext } from "@/contexts/BusinessContext";

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  sale: {
    totalAmount: number;
    date: string;
    customer: { name: string; phone: string | null; email: string | null } | null;
    items: { productName: string; quantity: number; unitPrice: number; total: number }[];
  };
}

interface EventInvoiceRecord {
  id: string;
  invoiceNumber: string;
  budgetAmount: number;
  totalCost: number;
  createdAt: string;
  event: {
    name: string;
    eventType: string;
    eventDate: string | null;
    plateCount: number;
    customerBudget: number;
    customer: { name: string; phone: string | null; email: string | null } | null;
    items: { name: string; quantity: number; unit: string; unitCost: number; totalCost: number }[];
  };
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [eventInvoices, setEventInvoices] = useState<EventInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("My Business");
  const [currency, setCurrency] = useState("UGX");
  const { businessType } = useBusinessContext();
  const isFood = businessType === "FOOD";
  const [tab, setTab] = useState<"sales" | "events">(isFood ? "events" : "sales");

  useEffect(() => {
    const fetches = [
      fetch("/api/invoices").then((r) => r.json()),
      fetch("/api/business").then((r) => r.json()),
    ];

    Promise.all(fetches).then(([inv, biz]) => {
      setInvoices(Array.isArray(inv) ? inv : []);
      if (biz.business) {
        setBusinessName(biz.business.name);
        setCurrency(biz.business.currency);
        // If food business, fetch event invoices
        if (biz.business.businessType === "FOOD") {
          fetch("/api/events")
            .then((r) => r.json())
            .then((events) => {
              if (Array.isArray(events)) {
                const evtInvoices: EventInvoiceRecord[] = [];
                for (const event of events) {
                  if (event.invoices) {
                    for (const inv of event.invoices) {
                      evtInvoices.push({ ...inv, event });
                    }
                  }
                }
                evtInvoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setEventInvoices(evtInvoices);
              }
            });
        }
      }
      setLoading(false);
    });
  }, []);

  const openPDF = useCallback((blob: Blob, filename: string) => {
    // Force octet-stream so iOS Safari downloads instead of opening inline
    const downloadBlob = new Blob([blob], { type: "application/octet-stream" });
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  }, []);

  const downloadPDF = useCallback((invoice: InvoiceRecord) => {
    const data: InvoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      businessName,
      businessCurrency: currency,
      customerName: invoice.sale.customer?.name || "Walk-in Customer",
      customerPhone: invoice.sale.customer?.phone || undefined,
      customerEmail: invoice.sale.customer?.email || undefined,
      date: new Date(invoice.sale.date).toLocaleDateString(),
      items: invoice.sale.items,
      totalAmount: invoice.sale.totalAmount,
    };
    openPDF(generateInvoicePDF(data), `${invoice.invoiceNumber}.pdf`);
  }, [businessName, currency, openPDF]);

  const downloadEventPDF = useCallback((inv: EventInvoiceRecord) => {
    const data: EventInvoiceData = {
      invoiceNumber: inv.invoiceNumber,
      businessName,
      businessCurrency: currency,
      customerName: inv.event.customer?.name || "Unknown Customer",
      customerPhone: inv.event.customer?.phone || undefined,
      customerEmail: inv.event.customer?.email || undefined,
      eventName: inv.event.name,
      eventType: inv.event.eventType,
      eventDate: inv.event.eventDate ? new Date(inv.event.eventDate).toLocaleDateString() : "TBD",
      date: new Date(inv.createdAt).toLocaleDateString(),
      items: inv.event.items,
      totalCost: inv.totalCost,
      customerBudget: inv.budgetAmount,
      plateCount: inv.event.plateCount,
    };
    openPDF(generateEventInvoicePDF(data), `${inv.invoiceNumber}.pdf`);
  }, [businessName, currency, openPDF]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Invoices"
        description="View and download invoices for sales and events"
      />

      {/* Tabs for food businesses */}
      {isFood && (
        <div className="flex gap-2">
          <button
            onClick={() => setTab("events")}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: tab === "events" ? "var(--accent-gradient)" : "var(--bg-card)",
              color: tab === "events" ? "#fff" : "var(--text-muted)",
              border: tab === "events" ? "none" : "1px solid var(--border-color)",
            }}
          >
            Event Invoices ({eventInvoices.length})
          </button>
          <button
            onClick={() => setTab("sales")}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: tab === "sales" ? "var(--accent-gradient)" : "var(--bg-card)",
              color: tab === "sales" ? "#fff" : "var(--text-muted)",
              border: tab === "sales" ? "none" : "1px solid var(--border-color)",
            }}
          >
            Sale Invoices ({invoices.length})
          </button>
        </div>
      )}

      {/* Event Invoices Tab */}
      {(tab === "events" && isFood) && (
        eventInvoices.length > 0 ? (
          <div className="space-y-2">
            {eventInvoices.map((inv, i) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-4 rounded-xl group"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.1)" }}>
                  <FileText size={18} style={{ color: "#10b981" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--accent-secondary)" }}>
                    {inv.invoiceNumber}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {inv.event.name} • {inv.event.customer?.name || "—"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {currency} {inv.totalCost.toLocaleString()}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Budget: {inv.budgetAmount.toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => downloadEventPDF(inv)}
                  className="p-2.5 rounded-xl transition-all shrink-0"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--accent-secondary)" }}
                  title="Download PDF"
                >
                  <Download size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileText size={24} style={{ color: "var(--text-muted)" }} />}
            title="No event invoices yet"
            description="Event invoices are generated when you confirm a job."
          />
        )
      )}

      {/* Sale Invoices Tab */}
      {(tab === "sales" || !isFood) && (
        invoices.length > 0 ? (
          <div className="space-y-2">
            {invoices.map((invoice, i) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-4 rounded-xl group"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.1)" }}>
                  <FileText size={18} style={{ color: "var(--accent-primary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--accent-secondary)" }}>
                    {invoice.invoiceNumber}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {invoice.sale.customer?.name || "Walk-in"} • {invoice.sale.items.length} item{invoice.sale.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {currency} {invoice.sale.totalAmount.toLocaleString()}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => downloadPDF(invoice)}
                  className="p-2.5 rounded-xl transition-all shrink-0"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--accent-secondary)" }}
                  title="Download PDF"
                >
                  <Download size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileText size={24} style={{ color: "var(--text-muted)" }} />}
            title="No invoices yet"
            description="Invoices are automatically generated when you make a sale."
          />
        )
      )}
    </div>
  );
}

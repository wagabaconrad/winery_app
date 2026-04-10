"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Download } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { LoadingSpinner, EmptyState } from "@/components/ui";
import { generateInvoicePDF, InvoiceData } from "@/lib/invoice-pdf";

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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("My Business");
  const [currency, setCurrency] = useState("UGX");

  useEffect(() => {
    Promise.all([
      fetch("/api/invoices").then((r) => r.json()),
      fetch("/api/business").then((r) => r.json()),
    ]).then(([inv, biz]) => {
      setInvoices(inv);
      if (biz.business) {
        setBusinessName(biz.business.name);
        setCurrency(biz.business.currency);
      }
      setLoading(false);
    });
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

    const pdfDataUri = generateInvoicePDF(data);
    const link = document.createElement("a");
    link.href = pdfDataUri;
    link.download = `${invoice.invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [businessName, currency]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Invoices"
        description="View and download invoices for all sales"
      />

      {invoices.length > 0 ? (
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
      )}
    </div>
  );
}

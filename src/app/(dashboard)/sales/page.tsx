"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, Zap, UserPlus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { Button, LoadingSpinner, EmptyState } from "@/components/ui";

interface SaleItem {
  productName: string;
  quantity: number | string;
  unitPrice: number | string;
  unitCost: number | string;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  category: string;
}

interface Sale {
  id: string;
  totalAmount: number;
  costOfGoods: number;
  profit: number;
  date: string;
  customer: { name: string } | null;
  items: { productName: string; quantity: number; unitPrice: number; total: number }[];
  invoice: { invoiceNumber: string } | null;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [finishedStock, setFinishedStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPOS, setShowPOS] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<SaleItem[]>([
    { productName: "", quantity: "", unitPrice: "", unitCost: "" },
  ]);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "" });

  useEffect(() => {
    Promise.all([
      fetch("/api/sales").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/stock").then((r) => r.json()),
    ]).then(([s, c, stock]) => {
      setSales(s);
      setCustomers(c);
      const finished = Array.isArray(stock) ? stock.filter((i: StockItem) => i.category === "FINISHED") : [];
      setFinishedStock(finished);
      setLoading(false);
    });
  }, []);

  const addItem = () => {
    setItems([...items, { productName: "", quantity: "", unitPrice: "", unitCost: "" }]);
  };

  const updateItem = (index: number, field: keyof SaleItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    // When selecting a product from stock, auto-fill the unit cost
    if (field === "productName") {
      const stockMatch = finishedStock.find((s) => s.name === value);
      if (stockMatch) {
        updated[index].unitCost = String(stockMatch.unitCost);
      }
    }
    setItems(updated);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const getTotal = () => {
    return items.reduce((sum, item) => {
      return sum + (parseFloat(String(item.quantity)) || 0) * (parseFloat(String(item.unitPrice)) || 0);
    }, 0);
  };

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((i) => i.productName && i.quantity && i.unitPrice);
    if (!validItems.length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customerId || null, items: validItems }),
      });
      if (res.ok) {
        setShowPOS(false);
        setItems([{ productName: "", quantity: "", unitPrice: "", unitCost: "" }]);
        setCustomerId("");
        const updated = await fetch("/api/sales").then((r) => r.json());
        setSales(updated);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCustomer(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });
      if (res.ok) {
        const customer = await res.json();
        setCustomers([customer, ...customers]);
        setCustomerId(customer.id);
        setShowCustomerModal(false);
        setNewCustomer({ name: "", phone: "", email: "" });
      }
    } finally {
      setSavingCustomer(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Sales & POS"
        description="Record sales and manage transactions"
        action={
          <Button onClick={() => setShowPOS(true)}>
            <Zap size={16} /> Quick Sale
          </Button>
        }
      />

      {/* Sales List */}
      {sales.length > 0 ? (
        <div className="space-y-2">
          {sales.map((sale, i) => (
            <motion.div
              key={sale.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.1)" }}>
                <ShoppingCart size={18} style={{ color: "var(--success)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {sale.customer?.name || "Walk-in Customer"}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                  {sale.items.map((i) => `${i.productName} ×${i.quantity}`).join(", ")}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold" style={{ color: "var(--success)" }}>
                  {sale.totalAmount.toLocaleString()}
                </p>
                <p className="text-xs" style={{ color: sale.profit >= 0 ? "var(--success)" : "var(--danger)" }}>
                  Profit: {sale.profit.toLocaleString()}
                </p>
              </div>
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-xs" style={{ color: "var(--accent-secondary)" }}>
                  {sale.invoice?.invoiceNumber}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {new Date(sale.date).toLocaleDateString()}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ShoppingCart size={24} style={{ color: "var(--text-muted)" }} />}
          title="No sales yet"
          description="Record your first sale using the Quick Sale button."
          action={<Button onClick={() => setShowPOS(true)}><Zap size={16} /> Quick Sale</Button>}
        />
      )}

      {/* POS Modal */}
      <Modal isOpen={showPOS} onClose={() => setShowPOS(false)} title="Quick Sale — POS" maxWidth="650px">
        <form onSubmit={handleSale} className="space-y-5">
          {/* Customer */}
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Customer (optional)</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div className="flex items-end">
              <button type="button" onClick={() => setShowCustomerModal(true)} className="p-2.5 rounded-xl" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--accent-secondary)" }}>
                <UserPlus size={18} />
              </button>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Items
                {finishedStock.length > 0 && (
                  <span className="ml-2 font-normal" style={{ color: "var(--text-muted)" }}>
                    — select from inventory or type a name
                  </span>
                )}
              </p>
              <button type="button" onClick={addItem} className="text-xs font-medium" style={{ color: "var(--accent-secondary)" }}>+ Add Item</button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 mb-1">
              <p className="col-span-4 text-[10px]" style={{ color: "var(--text-muted)" }}>Product</p>
              <p className="col-span-2 text-[10px]" style={{ color: "var(--text-muted)" }}>Qty</p>
              <p className="col-span-3 text-[10px]" style={{ color: "var(--text-muted)" }}>Sell Price</p>
              <p className="col-span-2 text-[10px]" style={{ color: "var(--text-muted)" }}>Total</p>
            </div>

            {/* datalist for stock suggestions */}
            <datalist id="finished-stock-list">
              {finishedStock.map((s) => (
                <option key={s.id} value={s.name}>{s.name} ({s.quantity} {s.unit} in stock)</option>
              ))}
            </datalist>

            {items.map((item, idx) => {
              const stockItem = finishedStock.find((s) => s.name === item.productName);
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                  <div className="col-span-4">
                    <input
                      list="finished-stock-list"
                      type="text"
                      value={item.productName}
                      onChange={(e) => updateItem(idx, "productName", e.target.value)}
                      placeholder="Select or type product"
                      required
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                      style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                    />
                    {stockItem && (
                      <p className="text-[10px] mt-0.5 px-1" style={{ color: "var(--text-muted)" }}>
                        {stockItem.quantity} {stockItem.unit} in stock
                      </p>
                    )}
                  </div>
                  <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} placeholder="Qty" min="1" required className="col-span-2 px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                  <div className="col-span-3 space-y-1">
                    <input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} placeholder="Sell price" min="0" required className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                    {/* Cost (hidden if auto-filled from stock, shown as small label) */}
                    {!stockItem && (
                      <input type="number" value={item.unitCost} onChange={(e) => updateItem(idx, "unitCost", e.target.value)} placeholder="Unit cost" min="0" className="w-full px-3 py-1.5 rounded-xl text-[10px] outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-muted)" }} />
                    )}
                    {stockItem && (
                      <p className="text-[10px] px-1" style={{ color: "var(--text-muted)" }}>
                        Cost: {stockItem.unitCost.toLocaleString()} (auto)
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center justify-between pl-1">
                    <span className="text-xs font-semibold" style={{ color: "var(--success)" }}>
                      {((parseFloat(String(item.quantity)) || 0) * (parseFloat(String(item.unitPrice)) || 0)).toLocaleString()}
                    </span>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-xs" style={{ color: "var(--danger)" }}>✕</button>
                    )}
                  </div>
                  <div className="col-span-1" />
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Total</p>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {getTotal().toLocaleString()}
            </p>
          </div>

          <Button type="submit" loading={saving} className="w-full">
            Complete Sale & Generate Invoice
          </Button>
        </form>
      </Modal>

      {/* New Customer Modal */}
      <Modal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Add Customer">
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Name</label>
            <input type="text" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} required placeholder="Customer name" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Phone</label>
              <input type="text" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="Optional" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Email</label>
              <input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} placeholder="Optional" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            </div>
          </div>
          <Button type="submit" loading={savingCustomer} className="w-full">Add Customer</Button>
        </form>
      </Modal>
    </div>
  );
}

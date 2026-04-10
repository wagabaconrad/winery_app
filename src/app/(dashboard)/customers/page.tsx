"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Phone, Mail } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { Button, LoadingSpinner, EmptyState } from "@/components/ui";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      const json = await res.json();
      setCustomers(Array.isArray(json) ? json : []);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ name: "", phone: "", email: "" });
        fetchCustomers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create customer");
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Customers"
        description="Manage your customer database"
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Customer
          </Button>
        }
      />

      {/* Search */}
      {customers.length > 0 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full max-w-sm px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
        />
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((customer, i) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl p-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(124,58,237,0.1)" }}>
                  <span className="text-sm font-bold" style={{ color: "#a78bfa" }}>
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {customer.name}
                </p>
              </div>
              <div className="space-y-1 text-xs">
                {customer.phone && (
                  <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                    <Phone size={12} /> {customer.phone}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                    <Mail size={12} /> {customer.email}
                  </div>
                )}
                <p style={{ color: "var(--text-muted)" }}>
                  Since {new Date(customer.createdAt).toLocaleDateString()}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Users size={24} style={{ color: "var(--text-muted)" }} />}
          title={search ? "No customers match your search" : "No customers yet"}
          description={search ? "Try a different search term." : "Add your first customer to get started."}
          action={!search ? <Button onClick={() => setShowModal(true)}><Plus size={16} /> Add Customer</Button> : undefined}
        />
      )}

      {/* Add Customer Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Customer">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" required className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Phone (optional)</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +256 700 000 000" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Email (optional)</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="customer@email.com" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
          </div>
          <Button type="submit" loading={saving} className="w-full">
            Add Customer
          </Button>
        </form>
      </Modal>
    </div>
  );
}

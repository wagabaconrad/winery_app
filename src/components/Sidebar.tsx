"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  FlaskConical,
  ShoppingCart,
  Receipt,
  FileText,
  Calculator,
  BarChart3,
  Wallet,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Wine,
  CalendarDays,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useBusinessContext } from "@/contexts/BusinessContext";

const wineNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/capital", label: "Capital", icon: Wallet },
  { href: "/stock", label: "Inventory", icon: Package },
  { href: "/batches", label: "Production", icon: FlaskConical },
  { href: "/sales", label: "Sales & POS", icon: ShoppingCart },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const foodNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/capital", label: "Capital", icon: Wallet },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  const { businessType, businessName } = useBusinessContext();

  const navItems = businessType === "FOOD" ? foodNavItems : wineNavItems;
  const LogoIcon = businessType === "FOOD" ? UtensilsCrossed : Wine;
  const subtitle = businessType === "FOOD" ? "Catering Intelligence" : "Business Intelligence";

  const handleLogout = async () => {
    try { sessionStorage.clear(); } catch { /* ignore */ }
    await signOut();
    router.push("/sign-in");
  };

  return (
    <>
      {/* Mobile toggle — hidden when sidebar is open */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-xl lg:hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          width: "260px",
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-color)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-gradient)" }}
          >
            <LogoIcon size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
              {businessName || "Winery OS"}
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {subtitle}
            </p>
          </div>
          {/* Close button — mobile only, sits at the right of the header */}
          <motion.button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg shrink-0"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close menu"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <X size={18} />
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group"
                  style={{
                    background: isActive ? "var(--accent-gradient)" : "transparent",
                    color: isActive ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  <Icon size={18} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <ChevronRight size={14} className="opacity-70" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid var(--border-color)" }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium w-full transition-all duration-200"
            style={{ color: "var(--text-muted)" }}
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

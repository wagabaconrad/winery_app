"use client";

import React from "react";
import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  accentColor?: string;
  delay?: number;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  accentColor = "var(--accent-primary)",
  delay = 0,
}: StatCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "var(--success)" : trend === "down" ? "var(--danger)" : "var(--text-muted)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-2xl p-5 relative overflow-hidden group"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
      }}
    >
      {/* Accent line */}
      <div
        className="absolute top-0 left-0 w-full h-0.5"
        style={{ background: accentColor }}
      />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p
            className="text-xs font-medium uppercase tracking-wider mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            {title}
          </p>
          <p className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {subtitle}
            </p>
          )}
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon size={14} style={{ color: trendColor }} />
              <span className="text-xs font-medium" style={{ color: trendColor }}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}15` }}
        >
          <Icon size={20} style={{ color: accentColor }} />
        </div>
      </div>
    </motion.div>
  );
}

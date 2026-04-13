"use client";

import { motion } from "framer-motion";

export default function AuthPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="contents"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* Animated background glow */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(139,92,246,0.12), transparent)",
        }}
      />

      {/* Content slides up */}
      <motion.div
        className="contents"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

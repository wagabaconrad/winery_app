"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

export function SignInButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    router.push("/sign-in");
  };

  return (
    <motion.button
      onClick={handleClick}
      className="text-sm font-medium transition-colors text-gray-300 hover:text-white flex items-center gap-1.5"
      whileTap={{ scale: 0.96 }}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5"
          >
            <Loader2 size={13} className="animate-spin" />
            <span>Opening…</span>
          </motion.span>
        ) : (
          <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Sign In
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function GetStartedButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    router.push("/sign-up");
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={loading}
      className="px-5 py-2.5 rounded-full text-sm font-semibold bg-white text-black transition hover:bg-gray-200 flex items-center gap-1.5 min-w-[110px] justify-center"
      whileTap={{ scale: 0.96 }}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5"
          >
            <Loader2 size={13} className="animate-spin" />
            <span>Loading…</span>
          </motion.span>
        ) : (
          <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Get Started
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

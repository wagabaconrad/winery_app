"use client";

import { useEffect, useState } from "react";

export default function SignInStuckHelper() {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowHelp(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  if (!showHelp) return null;

  return (
    <div className="mt-6 text-center animate-fade-in">
      <p className="text-xs" style={{ color: "#9898a8" }}>
        Sign-in form not loading?{" "}
        <a
          href="/api/auth/reset"
          className="underline font-medium"
          style={{ color: "#a78bfa" }}
        >
          Reset session & try again
        </a>
      </p>
    </div>
  );
}

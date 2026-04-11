import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Wine, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="flex h-screen w-full items-center justify-center bg-black relative">
      {/* Top nav — always visible, no Clerk JS needed */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium transition-colors text-[#9898a8] hover:text-[#f0f0f5]"
        >
          <ArrowLeft size={15} />
          Back to home
        </Link>
      </div>

      <div className="flex flex-col items-center w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl"
            style={{ background: "var(--accent-gradient)" }}
          >
            <Wine size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#f0f0f5]">Winery OS</h1>
            <p className="text-xs tracking-widest uppercase font-bold text-[#9898a8]">Intelligence</p>
          </div>
        </div>

        {/* Clerk widget with skeleton fallback */}
        <Suspense fallback={<SignInSkeleton />}>
          <SignIn fallbackRedirectUrl="/dashboard" />
        </Suspense>
      </div>
    </div>
  );
}

function SignInSkeleton() {
  return (
    <div className="w-full rounded-2xl p-8 space-y-4" style={{ background: "#111118", border: "1px solid #2a2a3a" }}>
      <div className="h-5 w-32 rounded-lg animate-pulse" style={{ background: "#2a2a3a" }} />
      <div className="space-y-2">
        <div className="h-3 w-16 rounded animate-pulse" style={{ background: "#2a2a3a" }} />
        <div className="h-10 w-full rounded-xl animate-pulse" style={{ background: "#2a2a3a" }} />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-16 rounded animate-pulse" style={{ background: "#2a2a3a" }} />
        <div className="h-10 w-full rounded-xl animate-pulse" style={{ background: "#2a2a3a" }} />
      </div>
      <div className="h-10 w-full rounded-xl animate-pulse" style={{ background: "#3a2a5a" }} />
      <p className="text-center text-xs" style={{ color: "#9898a8" }}>Loading sign-in form…</p>
    </div>
  );
}

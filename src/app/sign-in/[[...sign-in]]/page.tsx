import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Wine, ArrowLeft, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default async function SignInPage() {
  // If already signed in, skip the sign-in page entirely
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="flex h-screen w-full items-center justify-center bg-black relative">
      {/* Always-visible top nav — works even if Clerk JS fails to load */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium transition-colors text-[#9898a8] hover:text-[#f0f0f5]"
        >
          <ArrowLeft size={15} />
          Back to home
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-all"
          style={{ background: "rgba(255,255,255,0.08)", color: "#f0f0f5", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <LayoutDashboard size={14} />
          Go to Dashboard
        </Link>
      </div>

      <div className="flex flex-col items-center">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl"
            style={{ background: "var(--accent-gradient)" }}
          >
            <Wine size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#f0f0f5]">
              Winery OS
            </h1>
            <p className="text-xs tracking-widest uppercase font-bold text-[#9898a8]">
              Intelligence
            </p>
          </div>
        </div>
        <SignIn fallbackRedirectUrl="/dashboard" />
      </div>
    </div>
  );
}

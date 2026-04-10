import { SignIn } from "@clerk/nextjs";
import { Wine } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-black">
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

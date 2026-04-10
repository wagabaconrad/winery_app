import Sidebar from "@/components/Sidebar";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <BusinessProvider>
      <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
        <Sidebar />
        <main
          className="transition-all duration-300 lg:ml-[260px] min-h-screen"
        >
          <div className="px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </BusinessProvider>
  );
}

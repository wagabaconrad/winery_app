import type { Metadata, Viewport } from "next";
import { CinematicFooter } from "@/components/ui/motion-footer";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Winery OS — Wine & Food Business Intelligence",
  description: "Track capital, inventory, production, sales, and profit for your wine & food business.",
};

// Extend into notch / Dynamic Island / rounded corners on iOS/Android
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f]">
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}

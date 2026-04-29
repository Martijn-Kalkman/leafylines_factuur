import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { DbSyncProvider } from "@/components/DbSyncProvider";

export const metadata: Metadata = {
  title: "LeafyLines Dashboard",
  description: "Facturen & Offertes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <DbSyncProvider>
          <ToastProvider>{children}</ToastProvider>
        </DbSyncProvider>
      </body>
    </html>
  );
}
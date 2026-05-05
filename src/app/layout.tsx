import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { DbSyncProvider } from "@/components/DbSyncProvider";
import ThemeInitializer from "@/components/ThemeInitializer";

export const metadata: Metadata = {
  title: "LeafyLines Dashboard",
  description: "Facturen & Offertes",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <ThemeInitializer />
        <DbSyncProvider>
          <ToastProvider>{children}</ToastProvider>
        </DbSyncProvider>
      </body>
    </html>
  );
}
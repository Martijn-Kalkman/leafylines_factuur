"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, FileText, FilePlus, Users, Settings, Mail } from "lucide-react";
import Image from "next/image";
import { useStore } from "@/store/useStore";

const nav = [
  { href: "/dashboard",  icon: LayoutDashboard, label: "Dashboard" },
  { href: "/documenten", icon: FileText,         label: "Documenten" },
  { href: "/klanten",    icon: Users,            label: "Klanten" },
  { href: "/nieuw",      icon: FilePlus,         label: "Nieuw" },
  { href: "/emails",     icon: Mail,             label: "Emails" },
];

export default function Sidebar() {
  const path = usePathname();
  const [role, setRole] = useState<"user" | "admin" | null>(null);
  const { resetClientSupportHoursIfNeeded } = useStore();
  useEffect(() => {
    resetClientSupportHoursIfNeeded();
  }, [resetClientSupportHoursIfNeeded]);
  useEffect(() => {
    const loadSession = async () => {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { authenticated?: boolean; user?: { role?: "user" | "admin" } };
      if (data.authenticated && data.user?.role) setRole(data.user.role);
    };
    void loadSession();
  }, []);
  const isActive = (href: string) =>
    path === href || path.startsWith(href + "/");

  return (
    <aside style={{
      position: "fixed", top: 0, left: 0, height: "100vh", width: 220,
      background: "white", borderRight: "1px solid #f0f0f0",
      display: "flex", flexDirection: "column", zIndex: 10,
    }}>
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "center" }}>
        <Image src="/leaf.png" alt="LeafyLines" width={140} height={70}
          style={{ objectFit: "contain", width: "auto", height: 56 }} priority />
      </div>

      <nav style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
        {nav.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "9px 12px", borderRadius: 8, fontSize: 14, fontWeight: 500,
              textDecoration: "none", transition: "all 0.15s",
              background: active ? "var(--primary)" : "transparent",
              color: active ? "#1a6b61" : "var(--gray2)",
            }}>
              <Icon size={16} />{label}
            </Link>
          );
        })}
        <Link href="/profile" style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "9px 12px", borderRadius: 8, fontSize: 14, fontWeight: 500,
          textDecoration: "none", transition: "all 0.15s",
          background: isActive("/profile") ? "var(--primary)" : "transparent",
          color: isActive("/profile") ? "#1a6b61" : "var(--gray2)",
        }}>
          <Users size={16} />Profiel
        </Link>
        {role === "admin" && (
          <Link href="/users" style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "9px 12px", borderRadius: 8, fontSize: 14, fontWeight: 500,
            textDecoration: "none", transition: "all 0.15s",
            background: isActive("/users") ? "var(--primary)" : "transparent",
            color: isActive("/users") ? "#1a6b61" : "var(--gray2)",
          }}>
            <Users size={16} />Users
          </Link>
        )}
      </nav>

      <div style={{ padding: 12, borderTop: "1px solid #f0f0f0" }}>
        <Link href="/instellingen" style={{
          display: "flex", alignItems: "center", gap: 12, padding: "9px 12px",
          borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: "none",
          transition: "all 0.15s",
          background: isActive("/instellingen") ? "var(--primary)" : "transparent",
          color: isActive("/instellingen") ? "#1a6b61" : "var(--gray3)",
        }}>
          <Settings size={16} />Instellingen
        </Link>
        <button
          className="btn-outline"
          style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
        >
          Uitloggen
        </button>
      </div>
    </aside>
  );
}
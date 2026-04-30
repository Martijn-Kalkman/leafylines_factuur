"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, FileText, FilePlus, Users, Settings, Mail, ShieldCheck, UserPlus, Menu, X } from "lucide-react";
import Image from "next/image";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const loadSession = async () => {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { authenticated?: boolean; user?: { role?: "user" | "admin" } };
      if (data.authenticated && data.user?.role) setRole(data.user.role);
    };
    void loadSession();
  }, []);
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);
  const isActive = (href: string) =>
    path === href || path.startsWith(href + "/");

  const navContent = (
    <>
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
          <>
            <p style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--gray4)", margin: "10px 12px 4px" }}>
              Admin
            </p>
            <Link href="/users" style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "9px 12px", borderRadius: 8, fontSize: 14, fontWeight: 500,
              textDecoration: "none", transition: "all 0.15s",
              background: isActive("/users") ? "var(--primary)" : "transparent",
              color: isActive("/users") ? "#1a6b61" : "var(--gray2)",
            }}>
              <ShieldCheck size={16} />Users
            </Link>
            <Link href="/users/register" style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "9px 12px", borderRadius: 8, fontSize: 14, fontWeight: 500,
              textDecoration: "none", transition: "all 0.15s",
              background: isActive("/users/register") ? "var(--primary)" : "transparent",
              color: isActive("/users/register") ? "#1a6b61" : "var(--gray2)",
            }}>
              <UserPlus size={16} />Register
            </Link>
          </>
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
    </>
  );

  return (
    <>
      <header className="mobile-topbar">
        <Image src="/leaf.png" alt="LeafyLines" width={120} height={50} style={{ objectFit: "contain", width: "auto", height: 38 }} priority />
        <button className="btn-outline" style={{ padding: 8 }} onClick={() => setMobileOpen((value) => !value)} aria-label="Menu openen">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {mobileOpen && (
        <div className="mobile-sidebar-backdrop" onClick={() => setMobileOpen(false)}>
          <aside className="mobile-sidebar" onClick={(event) => event.stopPropagation()}>
            <div style={{ padding: "16px 14px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "center" }}>
              <Image src="/leaf.png" alt="LeafyLines" width={130} height={56} style={{ objectFit: "contain", width: "auto", height: 44 }} priority />
            </div>
            {navContent}
          </aside>
        </div>
      )}

      <aside className="desktop-sidebar" style={{
        position: "fixed", top: 0, left: 0, height: "100vh", width: 220,
        background: "white", borderRight: "1px solid #f0f0f0",
        flexDirection: "column", zIndex: 10,
      }}>
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "center" }}>
          <Image src="/leaf.png" alt="LeafyLines" width={140} height={70}
            style={{ objectFit: "contain", width: "auto", height: 56 }} priority />
        </div>
        {navContent}
      </aside>
    </>
  );
}
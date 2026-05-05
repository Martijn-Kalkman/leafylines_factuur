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
    const cachedRole = window.sessionStorage.getItem("leafylines:user-role");
    if (cachedRole === "admin" || cachedRole === "user") {
      setRole(cachedRole);
    }

    const loadSession = async () => {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { authenticated?: boolean; user?: { role?: "user" | "admin" } };
      if (data.authenticated && data.user?.role) {
        setRole(data.user.role);
        window.sessionStorage.setItem("leafylines:user-role", data.user.role);
      }
    };
    void loadSession();
  }, []);
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);
  const isExactActive = (href: string) => path === href;
  const isSectionActive = (href: string) => path === href || path.startsWith(`${href}/`);

  const navContent = (
    <>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = isSectionActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
                active
                  ? "bg-[var(--primary)] text-[var(--primary-ink)]"
                  : "text-[var(--gray2)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              <Icon size={16} />{label}
            </Link>
          );
        })}
        <Link
          href="/profile"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
            isSectionActive("/profile")
              ? "bg-[var(--primary)] text-[var(--primary-ink)]"
              : "text-[var(--gray2)] hover:bg-[var(--surface-muted)]"
          }`}
        >
          <Users size={16} />Profiel
        </Link>
        {role === "admin" && (
          <>
            <p className="mb-1 mt-3 px-3 text-[11px] uppercase tracking-wider text-[var(--gray4)]">
              Admin
            </p>
            <Link
              href="/users"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
                isExactActive("/users")
                  ? "bg-[var(--primary)] text-[var(--primary-ink)]"
                  : "text-[var(--gray2)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              <ShieldCheck size={16} />Users
            </Link>
            <Link
              href="/users/register"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
                isSectionActive("/users/register")
                  ? "bg-[var(--primary)] text-[var(--primary-ink)]"
                  : "text-[var(--gray2)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              <UserPlus size={16} />Register
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-[var(--border-soft)] p-3">
        <Link
          href="/instellingen"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
            isSectionActive("/instellingen")
              ? "bg-[var(--primary)] text-[var(--primary-ink)]"
              : "text-[var(--gray3)] hover:bg-[var(--surface-muted)]"
          }`}
        >
          <Settings size={16} />Instellingen
        </Link>
        <button
          className="btn-outline"
          type="button"
          style={{ width: "100%", marginTop: 8 }}
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.sessionStorage.removeItem("leafylines:user-role");
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
        <Image src="/leaf.png" alt="LeafyLines" width={120} height={50} className="h-[38px] w-auto object-contain" priority />
        <button className="btn-outline !p-2" onClick={() => setMobileOpen((value) => !value)} aria-label="Menu openen">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {mobileOpen && (
        <div className="mobile-sidebar-backdrop" onClick={() => setMobileOpen(false)}>
          <aside className="mobile-sidebar" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-center border-b border-[var(--border-soft)] px-3.5 py-4">
              <Image src="/leaf.png" alt="LeafyLines" width={130} height={56} className="h-11 w-auto object-contain" priority />
            </div>
            {navContent}
          </aside>
        </div>
      )}

      <aside className="desktop-sidebar fixed left-0 top-0 z-10 h-screen w-[220px] flex-col border-r border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="flex justify-center border-b border-[var(--border-soft)] px-4 pb-4 pt-5">
          <Image src="/leaf.png" alt="LeafyLines" width={140} height={70}
            className="h-14 w-auto object-contain" priority />
        </div>
        {navContent}
      </aside>
    </>
  );
}
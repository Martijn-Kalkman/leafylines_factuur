"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  createdAt: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      setErrorMessage("");
      const response = await fetch("/api/users", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        router.replace("/dashboard");
        return;
      }
      if (!response.ok) {
        setErrorMessage("Gebruikers laden mislukt.");
        return;
      }
      const data = await response.json();
      setUsers(data.users || []);
    };
    void loadUsers();
  }, [router]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--gray1)" }}>Users</h1>
        <p className="text-sm mb-6" style={{ color: "var(--gray3)" }}>Alle gebruikers (admin)</p>
        {errorMessage && (
          <div style={{ marginBottom: 12, background: "#fff1f1", border: "1px solid #f5b7b7", color: "#8a1f1f", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
            {errorMessage}
          </div>
        )}
        {statusMessage && (
          <div style={{ marginBottom: 12, background: "#ecfdf3", border: "1px solid #9be2b6", color: "#116734", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
            {statusMessage}
          </div>
        )}
        <div className="card">
          <table>
            <thead>
              <tr className="border-b border-gray-100">
                <th>Email</th><th>Naam</th><th>Rol</th><th>Aangemaakt</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-50">
                  <td className="text-xs" style={{ color: "var(--gray2)" }}>{user.email}</td>
                  <td className="text-xs" style={{ color: "var(--gray3)" }}>
                    <input
                      value={user.name}
                      onChange={(e) => {
                        const nextName = e.target.value;
                        setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, name: nextName } : item)));
                      }}
                      onBlur={async () => {
                        setErrorMessage("");
                        setStatusMessage("");
                        const response = await fetch("/api/users", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: user.id, name: user.name }),
                        });
                        if (!response.ok) {
                          setErrorMessage("Naam bijwerken mislukt.");
                          return;
                        }
                        setStatusMessage(`Naam bijgewerkt voor ${user.email}.`);
                      }}
                      style={{ minWidth: 180 }}
                    />
                  </td>
                  <td className="text-xs">
                    <select
                      value={user.role}
                      onChange={async (e) => {
                        setErrorMessage("");
                        setStatusMessage("");
                        const nextRole = e.target.value as "user" | "admin";
                        const response = await fetch("/api/users", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: user.id, role: nextRole }),
                        });
                        if (!response.ok) {
                          setErrorMessage("Rol bijwerken mislukt.");
                          return;
                        }
                        setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, role: nextRole } : item)));
                        setStatusMessage(`Rol bijgewerkt voor ${user.email} naar ${nextRole}.`);
                      }}
                      style={{ width: 120 }}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="text-xs" style={{ color: "var(--gray3)" }}>
                    {new Date(user.createdAt).toLocaleString("nl-NL")}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-sm" style={{ color: "var(--gray4)" }}>Geen gebruikers gevonden</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

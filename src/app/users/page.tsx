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
  const [drafts, setDrafts] = useState<Record<string, { name: string; role: "user" | "admin" }>>({});
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

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
      const loadedUsers = (data.users || []) as UserRow[];
      setUsers(loadedUsers);
      setDrafts(
        loadedUsers.reduce<Record<string, { name: string; role: "user" | "admin" }>>((acc, user) => {
          acc[user.id] = { name: user.name || "", role: user.role };
          return acc;
        }, {}),
      );
    };
    void loadUsers();
  }, [router]);

  const hasChanges = users.some((user) => {
    const draft = drafts[user.id];
    if (!draft) return false;
    return draft.name !== (user.name || "") || draft.role !== user.role;
  });

  const saveChanges = async () => {
    setErrorMessage("");
    setStatusMessage("");
    const changedUsers = users.filter((user) => {
      const draft = drafts[user.id];
      if (!draft) return false;
      return draft.name !== (user.name || "") || draft.role !== user.role;
    });
    if (changedUsers.length === 0) {
      setStatusMessage("Geen wijzigingen om op te slaan.");
      return;
    }

    setSaving(true);
    try {
      for (const user of changedUsers) {
        const draft = drafts[user.id];
        const response = await fetch("/api/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: user.id,
            name: draft.name,
            role: draft.role,
          }),
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          setErrorMessage(data.error || `Wijzigingen opslaan mislukt voor ${user.email}.`);
          return;
        }
      }
      setUsers((prev) =>
        prev.map((user) => {
          const draft = drafts[user.id];
          if (!draft) return user;
          return { ...user, name: draft.name, role: draft.role };
        }),
      );
      setStatusMessage(`${changedUsers.length} gebruiker(s) bijgewerkt.`);
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id: string) => {
    setErrorMessage("");
    setStatusMessage("");
    setDeletingUserId(id);
    try {
      const response = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setErrorMessage(data.error || "Gebruiker verwijderen mislukt.");
        return;
      }
      setUsers((prev) => prev.filter((user) => user.id !== id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setStatusMessage("Gebruiker verwijderd.");
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="app-main">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--gray1)" }}>Users</h1>
        <p className="text-sm mb-6" style={{ color: "var(--gray3)" }}>Alle gebruikers (admin)</p>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button className="btn-outline" onClick={() => router.push("/users/register")}>
            Nieuwe gebruiker
          </button>
        </div>
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
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button className="btn-primary" disabled={!hasChanges || saving} onClick={saveChanges}>
              {saving ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
          <table>
            <thead>
              <tr className="border-b border-gray-100">
                <th>Email</th><th>Naam</th><th>Rol</th><th>Aangemaakt</th><th>Acties</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-50">
                  <td className="text-xs" style={{ color: "var(--gray2)" }}>{user.email}</td>
                  <td className="text-xs" style={{ color: "var(--gray3)" }}>
                    <input
                      value={drafts[user.id]?.name ?? ""}
                      onChange={(e) => {
                        const nextName = e.target.value;
                        setDrafts((prev) => ({
                          ...prev,
                          [user.id]: { name: nextName, role: prev[user.id]?.role ?? user.role },
                        }));
                      }}
                      style={{ minWidth: 180 }}
                    />
                  </td>
                  <td className="text-xs">
                    <select
                      value={drafts[user.id]?.role ?? user.role}
                      onChange={(e) => {
                        const nextRole = e.target.value as "user" | "admin";
                        setDrafts((prev) => ({
                          ...prev,
                          [user.id]: { name: prev[user.id]?.name ?? user.name ?? "", role: nextRole },
                        }));
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
                  <td className="text-xs">
                    <button
                      className="btn-danger"
                      disabled={deletingUserId === user.id}
                      onClick={() => {
                        if (window.confirm(`Weet je zeker dat je ${user.email} wilt verwijderen?`)) {
                          void deleteUser(user.id);
                        }
                      }}
                    >
                      {deletingUserId === user.id ? "Verwijderen..." : "Verwijderen"}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-sm" style={{ color: "var(--gray4)" }}>Geen gebruikers gevonden</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";

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
  const [pendingDeleteUser, setPendingDeleteUser] = useState<UserRow | null>(null);

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
        <h1 className="mb-1 text-2xl font-semibold text-[var(--gray1)]">Users</h1>
        <p className="mb-6 text-sm text-[var(--gray3)]">Alle gebruikers (admin)</p>
        <div className="mb-3 flex justify-end">
          <button className="btn-outline" onClick={() => router.push("/users/register")}>
            Nieuwe gebruiker
          </button>
        </div>
        {errorMessage && (
          <div className="mb-3 rounded-lg border border-[#f5b7b7] bg-[#fff1f1] px-3 py-2.5 text-[13px] text-[#8a1f1f]">
            {errorMessage}
          </div>
        )}
        {statusMessage && (
          <div className="mb-3 rounded-lg border border-[#9be2b6] bg-[#ecfdf3] px-3 py-2.5 text-[13px] text-[#116734]">
            {statusMessage}
          </div>
        )}
        <div className="card">
          <div className="mb-3 flex justify-end">
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
                  <td className="text-xs text-[var(--gray2)]">{user.email}</td>
                  <td className="text-xs text-[var(--gray3)]">
                    <input
                      className="min-w-[180px]"
                      value={drafts[user.id]?.name ?? ""}
                      onChange={(e) => {
                        const nextName = e.target.value;
                        setDrafts((prev) => ({
                          ...prev,
                          [user.id]: { name: nextName, role: prev[user.id]?.role ?? user.role },
                        }));
                      }}
                    />
                  </td>
                  <td className="text-xs">
                    <select
                      className="w-[120px]"
                      value={drafts[user.id]?.role ?? user.role}
                      onChange={(e) => {
                        const nextRole = e.target.value as "user" | "admin";
                        setDrafts((prev) => ({
                          ...prev,
                          [user.id]: { name: prev[user.id]?.name ?? user.name ?? "", role: nextRole },
                        }));
                      }}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="text-xs text-[var(--gray3)]">
                    {new Date(user.createdAt).toLocaleString("nl-NL")}
                  </td>
                  <td className="text-xs">
                    <button
                      className="btn-danger"
                      disabled={deletingUserId === user.id}
                      onClick={() => setPendingDeleteUser(user)}
                    >
                      {deletingUserId === user.id ? "Verwijderen..." : "Verwijderen"}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-[var(--gray4)]">Geen gebruikers gevonden</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <ConfirmModal
          open={pendingDeleteUser !== null}
          title="Gebruiker verwijderen"
          message={
            pendingDeleteUser ? `Weet je zeker dat je ${pendingDeleteUser.email} wilt verwijderen?` : ""
          }
          confirmLabel="Verwijderen"
          confirmVariant="danger"
          onCancel={() => setPendingDeleteUser(null)}
          onConfirm={() => {
            if (!pendingDeleteUser) return;
            const id = pendingDeleteUser.id;
            setPendingDeleteUser(null);
            void deleteUser(id);
          }}
        />
      </main>
    </div>
  );
}

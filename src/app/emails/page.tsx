"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

interface SharedEmailLog {
  id: string;
  createdAt: string;
  subject: string;
  to: string;
  kind: "document" | "confirmation";
  status: "success" | "failed";
  error?: string;
  sentBy?: string;
}

export default function EmailsPage() {
  const [emailLogs, setEmailLogs] = useState<SharedEmailLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLogs = async () => {
      setError("");
      const response = await fetch("/api/emails", { cache: "no-store" });
      if (!response.ok) {
        setError("E-maillogs laden mislukt.");
        return;
      }
      const data = (await response.json()) as { emailLogs?: SharedEmailLog[] };
      setEmailLogs(data.emailLogs ?? []);
    };
    void loadLogs();
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--gray1)" }}>Emails</h1>
            <p className="text-sm" style={{ color: "var(--gray3)" }}>
              {emailLogs.length} verzendlog item{emailLogs.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {error && (
          <div style={{ marginBottom: 12, background: "#fff1f1", border: "1px solid #f5b7b7", color: "#8a1f1f", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div className="card">
          <table>
            <thead>
              <tr className="border-b border-gray-100">
                <th>Wanneer</th>
                <th>Door</th>
                <th>Naar</th>
                <th>Onderwerp</th>
                <th>Type</th>
                <th>Status</th>
                <th>Fout</th>
              </tr>
            </thead>
            <tbody>
              {emailLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-50">
                  <td className="text-xs" style={{ color: "var(--gray3)" }}>
                    {new Date(log.createdAt).toLocaleString("nl-NL")}
                  </td>
                  <td className="text-xs" style={{ color: "var(--gray3)" }}>{log.sentBy || "-"}</td>
                  <td className="text-xs" style={{ color: "var(--gray2)" }}>{log.to}</td>
                  <td className="text-xs font-medium" style={{ color: "var(--gray1)" }}>{log.subject}</td>
                  <td className="text-xs capitalize" style={{ color: "var(--gray3)" }}>{log.kind}</td>
                  <td className="text-xs">
                    <span
                      className="px-2 py-0.5 rounded"
                      style={{
                        background: log.status === "success" ? "#e6f4ec" : "#fef2f2",
                        color: log.status === "success" ? "#1a6e37" : "var(--error)",
                      }}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="text-xs" style={{ color: "var(--gray3)" }}>{log.error || "-"}</td>
                </tr>
              ))}
              {emailLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-sm" style={{ color: "var(--gray4)" }}>
                    Nog geen verzonden e-mails gelogd.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { type Client, useStore } from "@/store/useStore";

export function DbSyncProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const hydrateWorkspace = useStore((state) => state.hydrateWorkspace);
  const getWorkspacePayload = useStore((state) => state.getWorkspacePayload);
  const hasLoadedWorkspace = useStore((state) => state.hasLoadedWorkspace);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!active) return;
      if (!response.ok) {
        setIsAuthenticated(false);
        return;
      }
      const data = (await response.json()) as { authenticated?: boolean };
      setIsAuthenticated(data.authenticated === true);
    };
    void loadSession();
    const sessionTimer = setInterval(() => {
      if (!active || loadedRef.current) return;
      void loadSession();
    }, 1500);
    const onFocus = () => {
      if (!active || loadedRef.current) return;
      void loadSession();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      active = false;
      clearInterval(sessionTimer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (hasLoadedWorkspace) return;

    const loadWorkspace = async () => {
      const [settingsResponse, clientsResponse] = await Promise.all([
        fetch("/api/settings", { cache: "no-store" }),
        fetch("/api/klanten", { cache: "no-store" }),
      ]);
      if (!settingsResponse.ok || !clientsResponse.ok) return;
      const settingsPayload = (await settingsResponse.json()) as Record<string, unknown>;
      const clientsPayload = (await clientsResponse.json()) as { clients?: unknown[] };
      hydrateWorkspace({
        ...settingsPayload,
        clients: (clientsPayload.clients ?? []) as Client[],
      });
      loadedRef.current = true;
    };

    void loadWorkspace();
  }, [isAuthenticated, hasLoadedWorkspace, hydrateWorkspace]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!hasLoadedWorkspace) return;

    const unsubscribe = useStore.subscribe((state, previousState) => {
      if (state === previousState) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
          const payload = getWorkspacePayload();
          const settingsPayload = {
            documents: payload.documents,
            team: payload.team,
            company: payload.company,
            projects: payload.projects,
            clientNotes: payload.clientNotes,
            lineTemplates: payload.lineTemplates,
            emailIntegration: payload.emailIntegration,
            supportPolicy: payload.supportPolicy,
          };
          await Promise.all([
            fetch("/api/settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(settingsPayload),
            }),
            fetch("/api/klanten", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ clients: payload.clients }),
            }),
          ]);
        }, 400);
      });

    return () => {
      unsubscribe();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isAuthenticated, hasLoadedWorkspace, getWorkspacePayload]);

  return <>{children}</>;
}

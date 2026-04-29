import { create } from "zustand";

export type DocStatus = "concept" | "verzonden" | "betaald" | "openstaand";
export type DocType   = "factuur" | "offerte";
export type DocLang   = "nl" | "en";

export interface LineItem {
  id: string;
  product: string;
  description: string;
  price: number;
}

export interface Client {
  id: string;
  company: string;
  contactName: string;
  address: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  notes: string;
  supportHoursRemaining: number;
  supportCycleStart: string;
  recurringInvoice?: {
    enabled: boolean;
    frequency: "monthly" | "quarterly" | "yearly";
    amount: number;
    description: string;
    nextDate: string;
    autoSend: boolean;
  };
}

export interface Document {
  id: string;
  type: DocType;
  lang: DocLang;
  status: DocStatus;
  date: string;
  dueDate: string;
  contact: string;
  phone: string;
  client: string;
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientCountry: string;
  items: LineItem[];
  btwRate: number;
  notes: string;
  signaturesEnabled?: boolean;
  payerSignatureLabel?: string;
  projectId?: string | null;
  sourceQuoteId?: string | null;
  recurring?: "monthly" | "yearly" | null;
  recurringNextDate?: string | null;
  reminderSent?: boolean;
  reminderSentAt?: string | null;
  timeEntries: TimeEntry[];
  timeHourlyRate: number;
}

export interface TimeEntry {
  id: string;
  service: string;
  hours: number;
  section: string;
}

export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  initials: string;
  color: string;
  avatarDataUrl?: string;
  signature?: string;
}

export type ProjectStatus = "actief" | "afgerond" | "on_hold";

export interface Project {
  id: string;
  clientId: string;
  name: string;
  status: ProjectStatus;
  budget: number;
  notes: string;
  createdAt: string;
}

export interface ClientNote {
  id: string;
  clientId: string;
  text: string;
  createdAt: string;
  author: string;
  supportHoursUsed?: number;
}

export interface LineTemplate {
  id: string;
  title: string;
  product: string;
  description: string;
  price: number;
}

export type EmailProvider = "resend" | "sendgrid" | "gmail" | "none";

export interface EmailIntegration {
  provider: EmailProvider;
  enabled: boolean;
  fromEmail: string;
  apiKey: string;
  confirmationEmails: string[];
}

export interface EmailLog {
  id: string;
  createdAt: string;
  subject: string;
  to: string;
  kind: "document" | "confirmation";
  status: "success" | "failed";
  error?: string;
}

export interface SupportPolicy {
  hoursPerCycle: number;
  cycleMonths: number;
}

export interface CompanySettings {
  name: string;
  address: string;
  city: string;
  country: string;
  kvk: string;
  btw: string;
  iban: string;
  email: string;
  phone: string;
  website: string;
  signatureLegalText: string;
  footerText: string;
  defaultHourlyRate: number;
}

const DEFAULT_COMPANY: CompanySettings = {
  name:    "LeafyLines",
  address: "Zwanenkade 27",
  city:    "2925 AN Krimpen aan den Ijssel",
  country: "Nederland",
  kvk:     "90408357",
  btw:     "NL865304506 B01",
  iban:    "NL95 ABNA 0124677509",
  email:   "leafylinesdev@gmail.com",
  phone:   "",
  website: "",
  signatureLegalText: "Ondertekening voor akkoord. Door ondertekening bevestigen beide partijen de overeengekomen werkzaamheden en betalingsvoorwaarden.",
  footerText: "Gelieve het totaalbedrag binnen 14 dagen te voldoen op onze IBAN bankrekeningnummer ten name van LeafyLines onder vermelding van het factuurnummer {id}",
  defaultHourlyRate: 85,
};

const DEFAULT_TEAM: TeamMember[] = [
  { id: "1", name: "Martijn Kalkman", phone: "+31 6 10000001", email: "martijn@leafylines.nl", role: "Developer", initials: "MK", color: "#98E5D8", signature: "Martijn Kalkman" },
  { id: "2", name: "Calvin Hofman",   phone: "+31 6 10000002", email: "calvin@leafylines.nl",  role: "Designer",  initials: "CH", color: "#f5a623", signature: "Calvin Hofman" },
  { id: "3", name: "Thimo de Haan",   phone: "+31 6 10000003", email: "thimo@leafylines.nl",   role: "Developer", initials: "TH", color: "#3F80ED", signature: "Thimo de Haan" },
];

const DEFAULT_TEMPLATES: LineTemplate[] = [
  { id: "tpl-website", title: "Website", product: "Website", description: "Website ontwerp en ontwikkeling", price: 750 },
  { id: "tpl-hosting", title: "Hosting", product: "Hosting", description: "Maandelijkse hosting", price: 60 },
  { id: "tpl-email", title: "Email", description: "Zakelijke e-maildienst", product: "Email", price: 30 },
];

const DEFAULT_EMAIL_INTEGRATION: EmailIntegration = {
  provider: "none",
  enabled: false,
  fromEmail: "",
  apiKey: "",
  confirmationEmails: [],
};

const DEFAULT_SUPPORT_POLICY: SupportPolicy = {
  hoursPerCycle: 4,
  cycleMonths: 3,
};

interface Store {
  // Data
  documents: Document[];
  clients: Client[];
  team: TeamMember[];
  company: CompanySettings;
  projects: Project[];
  clientNotes: ClientNote[];
  lineTemplates: LineTemplate[];
  emailIntegration: EmailIntegration;
  emailLogs: EmailLog[];
  supportPolicy: SupportPolicy;
  hasLoadedWorkspace: boolean;
  // Document actions
  addDocument:    (doc: Document) => void;
  updateDocument: (id: string, doc: Partial<Document>) => void;
  renameDocumentId: (currentId: string, nextId: string) => boolean;
  deleteDocument: (id: string) => void;
  // Client actions
  addClient:    (client: Client) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  // Team actions
  addTeamMember:    (m: TeamMember) => void;
  updateTeamMember: (id: string, m: Partial<TeamMember>) => void;
  deleteTeamMember: (id: string) => void;
  // Company actions
  updateCompany: (s: Partial<CompanySettings>) => void;
  // Projects
  addProject: (project: Project) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  // Client notes
  addClientNote: (note: ClientNote) => void;
  deleteClientNote: (id: string) => void;
  // Templates
  addLineTemplate: (template: LineTemplate) => void;
  updateLineTemplate: (id: string, template: Partial<LineTemplate>) => void;
  deleteLineTemplate: (id: string) => void;
  // Document helpers
  markReminderSent: (id: string) => void;
  convertQuoteToInvoice: (id: string) => string | null;
  generateRecurringDocuments: (today?: string) => number;
  generateClientRecurringInvoices: (today?: string) => string[];
  // Integrations
  updateEmailIntegration: (integration: Partial<EmailIntegration>) => void;
  addEmailLog: (entry: Omit<EmailLog, "id" | "createdAt">) => void;
  hydrateWorkspace: (payload: Partial<Pick<Store, "documents" | "clients" | "team" | "company" | "projects" | "clientNotes" | "lineTemplates" | "emailIntegration" | "emailLogs" | "supportPolicy">>) => void;
  getWorkspacePayload: () => Pick<Store, "documents" | "clients" | "team" | "company" | "projects" | "clientNotes" | "lineTemplates" | "emailIntegration" | "emailLogs" | "supportPolicy">;
  updateSupportPolicy: (policy: Partial<SupportPolicy>) => void;
  updateClientSupportHours: (id: string, hours: number) => void;
  resetClientSupportHoursIfNeeded: (today?: string) => number;
  resetClientSupportHoursNow: (today?: string) => number;
}

export function calcTotals(items: LineItem[], btwRate: number) {
  const sub   = items.reduce((s, i) => s + (i.price || 0), 0);
  const tax   = parseFloat((sub * btwRate / 100).toFixed(2));
  const total = parseFloat((sub + tax).toFixed(2));
  return { sub, tax, total };
}

export function genId(docs: Document[]): string {
  const year = new Date().getFullYear();
  const nums = docs
    .filter((d) => d.id.includes(String(year)))
    .map((d) => parseInt(d.id.split("-")[2]));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `LL-${year}-${String(next).padStart(3, "0")}`;
}

function addMonths(dateString: string, months: number): string {
  const source = new Date(dateString);
  const next = new Date(source);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
}

function monthsBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
}

export function daysOverdue(dueDate: string, today = new Date().toISOString().slice(0, 10)): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const now = new Date(today);
  const diffMs = now.getTime() - due.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getYearMonth(date: string): string {
  return date.slice(0, 7);
}

export function getQuarter(date: string): string {
  const year = date.slice(0, 4);
  const month = Number(date.slice(5, 7));
  const quarter = Math.floor((month - 1) / 3) + 1;
  return `${year}-Q${quarter}`;
}

export function omzetPerMaand(docs: Document[]): Record<string, number> {
  return docs.reduce<Record<string, number>>((acc, d) => {
    if (d.type !== "factuur" || d.status !== "betaald") return acc;
    const bucket = getYearMonth(d.date);
    const { total } = calcTotals(d.items, d.btwRate);
    acc[bucket] = (acc[bucket] ?? 0) + total;
    return acc;
  }, {});
}

export function btwPerKwartaal(docs: Document[]): Record<string, number> {
  return docs.reduce<Record<string, number>>((acc, d) => {
    if (d.type !== "factuur") return acc;
    const bucket = getQuarter(d.date);
    const { tax } = calcTotals(d.items, d.btwRate);
    acc[bucket] = (acc[bucket] ?? 0) + tax;
    return acc;
  }, {});
}

export function omzetPerKlant(docs: Document[]): Record<string, number> {
  return docs.reduce<Record<string, number>>((acc, d) => {
    if (d.type !== "factuur" || d.status !== "betaald") return acc;
    const { total } = calcTotals(d.items, d.btwRate);
    acc[d.client] = (acc[d.client] ?? 0) + total;
    return acc;
  }, {});
}

export function getSupportUsageFromNote(text: string): number {
  const normalized = text.toLowerCase().replace(",", ".");
  const hasSupportContext = normalized.includes("support");
  if (!hasSupportContext) return 0;
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*uur/);
  if (!match) return 0;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value;
}

export const useStore = create<Store>()(
  (set, get) => ({
      documents: [],
      clients:   [],
      team:      DEFAULT_TEAM,
      company:   DEFAULT_COMPANY,
      projects: [],
      clientNotes: [],
      lineTemplates: DEFAULT_TEMPLATES,
      emailIntegration: DEFAULT_EMAIL_INTEGRATION,
      emailLogs: [],
      supportPolicy: DEFAULT_SUPPORT_POLICY,
      hasLoadedWorkspace: false,

      addDocument:    (doc)     => set((s) => ({ documents: [...s.documents, doc] })),
      updateDocument: (id, u)   => set((s) => ({ documents: s.documents.map((d) => d.id === id ? { ...d, ...u } : d) })),
      renameDocumentId: (currentId, nextId) => {
        const trimmedNextId = nextId.trim();
        let renamed = false;
        set((s) => {
          if (!trimmedNextId || currentId === trimmedNextId) {
            renamed = true;
            return s;
          }
          const exists = s.documents.some((d) => d.id === trimmedNextId);
          if (exists) return s;
          renamed = true;
          return {
            documents: s.documents.map((d) => d.id === currentId ? { ...d, id: trimmedNextId } : d),
          };
        });
        return renamed;
      },
      deleteDocument: (id)      => set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

      addClient:    (c)       => set((s) => ({ clients: [...s.clients, c] })),
      updateClient: (id, u)   => set((s) => ({ clients: s.clients.map((c) => c.id === id ? { ...c, ...u } : c) })),
      deleteClient: (id)      => set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),

      addTeamMember:    (m)     => set((s) => ({ team: [...s.team, m] })),
      updateTeamMember: (id, u) => set((s) => ({ team: s.team.map((m) => m.id === id ? { ...m, ...u } : m) })),
      deleteTeamMember: (id)    => set((s) => ({ team: s.team.filter((m) => m.id !== id) })),

      updateCompany: (u) => set((s) => ({ company: { ...s.company, ...u } })),
      addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),
      updateProject: (id, u) => set((s) => ({ projects: s.projects.map((p) => p.id === id ? { ...p, ...u } : p) })),
      deleteProject: (id) => set((s) => ({
        projects: s.projects.filter((p) => p.id !== id),
        documents: s.documents.map((d) => d.projectId === id ? { ...d, projectId: null } : d),
      })),
      addClientNote: (note) => set((s) => {
        const supportUsed = getSupportUsageFromNote(note.text);
        return {
          clientNotes: [{ ...note, supportHoursUsed: supportUsed || undefined }, ...s.clientNotes],
          clients: s.clients.map((c) => {
            if (c.id !== note.clientId || supportUsed <= 0) return c;
            return { ...c, supportHoursRemaining: Math.max(0, c.supportHoursRemaining - supportUsed) };
          }),
        };
      }),
      deleteClientNote: (id) => set((s) => ({ clientNotes: s.clientNotes.filter((n) => n.id !== id) })),
      addLineTemplate: (template) => set((s) => ({ lineTemplates: [...s.lineTemplates, template] })),
      updateLineTemplate: (id, u) => set((s) => ({ lineTemplates: s.lineTemplates.map((t) => t.id === id ? { ...t, ...u } : t) })),
      deleteLineTemplate: (id) => set((s) => ({ lineTemplates: s.lineTemplates.filter((t) => t.id !== id) })),
      markReminderSent: (id) => set((s) => ({
        documents: s.documents.map((d) => d.id === id ? { ...d, reminderSent: true, reminderSentAt: new Date().toISOString().slice(0, 10) } : d),
      })),
      convertQuoteToInvoice: (id) => {
        let createdId: string | null = null;
        set((s) => {
          const source = s.documents.find((d) => d.id === id);
          if (!source || source.type !== "offerte") return s;
          const newId = genId(s.documents);
          createdId = newId;
          return {
            documents: [
              ...s.documents,
              {
                ...source,
                id: newId,
                type: "factuur",
                status: "concept",
                date: new Date().toISOString().slice(0, 10),
                sourceQuoteId: source.id,
                reminderSent: false,
                reminderSentAt: null,
              },
            ],
          };
        });
        return createdId;
      },
      generateRecurringDocuments: (today = new Date().toISOString().slice(0, 10)) => {
        let created = 0;
        set((s) => {
          const toAdd: Document[] = [];
          const nextDocs = s.documents.map((d) => {
            if (!d.recurring || d.type !== "factuur") return d;
            const nextDate = d.recurringNextDate || d.dueDate || d.date;
            if (!nextDate || nextDate > today) return d;
            const newId = genId([...s.documents, ...toAdd]);
            toAdd.push({
              ...d,
              id: newId,
              status: "concept",
              date: today,
              dueDate: today,
              reminderSent: false,
              reminderSentAt: null,
            });
            created++;
            return {
              ...d,
              recurringNextDate: addMonths(nextDate, d.recurring === "monthly" ? 1 : 12),
            };
          });
          return { documents: [...nextDocs, ...toAdd] };
        });
        return created;
      },
      generateClientRecurringInvoices: (today = new Date().toISOString().slice(0, 10)) => {
        const createdIds: string[] = [];
        set((s) => {
          const toAdd: Document[] = [];
          const nextClients = s.clients.map((client) => {
            const recurring = client.recurringInvoice;
            if (!recurring?.enabled || !recurring.nextDate || recurring.nextDate > today) return client;
            const amount = Number(recurring.amount) || 0;
            if (amount <= 0) return client;
            const newId = genId([...s.documents, ...toAdd]);
            const description = recurring.description?.trim() || `Periodieke factuur voor ${client.company}`;
            toAdd.push({
              id: newId,
              type: "factuur",
              lang: "nl",
              status: "concept",
              date: today,
              dueDate: addMonths(today, 0),
              contact: s.team[0]?.name ?? "",
              phone: s.team[0]?.phone ?? "",
              client: client.company,
              clientName: client.contactName,
              clientAddress: client.address,
              clientCity: client.city,
              clientCountry: client.country,
              items: [{ id: `rec-${newId}`, product: "Periodieke factuur", description, price: amount }],
              btwRate: 21,
              notes: "Automatisch aangemaakt op basis van klant-instelling.",
              projectId: null,
              recurring: null,
              recurringNextDate: null,
              reminderSent: false,
              reminderSentAt: null,
              timeEntries: [],
              timeHourlyRate: s.company.defaultHourlyRate,
            });
            createdIds.push(newId);
            const monthStep = recurring.frequency === "monthly" ? 1 : recurring.frequency === "quarterly" ? 3 : 12;
            return {
              ...client,
              recurringInvoice: {
                ...recurring,
                nextDate: addMonths(recurring.nextDate, monthStep),
              },
            };
          });
          return { clients: nextClients, documents: [...s.documents, ...toAdd] };
        });
        return createdIds;
      },
      updateEmailIntegration: (u) => set((s) => ({ emailIntegration: { ...s.emailIntegration, ...u } })),
      addEmailLog: (entry) => set((s) => ({
        emailLogs: [
          {
            ...entry,
            id: Math.random().toString(36).slice(2, 9),
            createdAt: new Date().toISOString(),
          },
          ...s.emailLogs,
        ].slice(0, 1000),
      })),
      hydrateWorkspace: (payload) => set(() => ({
        documents: (payload.documents ?? []).map((d) => ({
          ...d,
          timeEntries: d.timeEntries ?? [],
          timeHourlyRate: d.timeHourlyRate ?? DEFAULT_COMPANY.defaultHourlyRate,
        })),
        clients: (payload.clients ?? []).map((c) => ({
          ...c,
          supportHoursRemaining: c.supportHoursRemaining ?? DEFAULT_SUPPORT_POLICY.hoursPerCycle,
          supportCycleStart: c.supportCycleStart ?? new Date().toISOString().slice(0, 10),
        })),
        team: payload.team ?? DEFAULT_TEAM,
        company: { ...DEFAULT_COMPANY, ...(payload.company ?? {}) },
        projects: payload.projects ?? [],
        clientNotes: payload.clientNotes ?? [],
        lineTemplates: payload.lineTemplates ?? DEFAULT_TEMPLATES,
        emailIntegration: { ...DEFAULT_EMAIL_INTEGRATION, ...(payload.emailIntegration ?? {}) },
        emailLogs: payload.emailLogs ?? [],
        supportPolicy: { ...DEFAULT_SUPPORT_POLICY, ...(payload.supportPolicy ?? {}) },
        hasLoadedWorkspace: true,
      })),
      getWorkspacePayload: () => {
        const state = get();
        return {
          documents: state.documents,
          clients: state.clients,
          team: state.team,
          company: state.company,
          projects: state.projects,
          clientNotes: state.clientNotes,
          lineTemplates: state.lineTemplates,
          emailIntegration: state.emailIntegration,
          emailLogs: state.emailLogs,
          supportPolicy: state.supportPolicy,
        };
      },
      updateSupportPolicy: (u) => set((s) => ({ supportPolicy: { ...s.supportPolicy, ...u } })),
      updateClientSupportHours: (id, hours) => set((s) => ({
        clients: s.clients.map((c) => c.id === id ? { ...c, supportHoursRemaining: Math.max(0, hours) } : c),
      })),
      resetClientSupportHoursIfNeeded: (today = new Date().toISOString().slice(0, 10)) => {
        let resetCount = 0;
        set((s) => ({
          clients: s.clients.map((c) => {
            if (!c.supportCycleStart) {
              return { ...c, supportCycleStart: today, supportHoursRemaining: s.supportPolicy.hoursPerCycle };
            }
            const elapsed = monthsBetween(c.supportCycleStart, today);
            if (elapsed < s.supportPolicy.cycleMonths) return c;
            resetCount++;
            return {
              ...c,
              supportHoursRemaining: s.supportPolicy.hoursPerCycle,
              supportCycleStart: today,
            };
          }),
        }));
        return resetCount;
      },
      resetClientSupportHoursNow: (today = new Date().toISOString().slice(0, 10)) => {
        let resetCount = 0;
        set((s) => ({
          clients: s.clients.map((c) => {
            resetCount++;
            return {
              ...c,
              supportHoursRemaining: s.supportPolicy.hoursPerCycle,
              supportCycleStart: today,
            };
          }),
        }));
        return resetCount;
      },
    })
);
import { create } from "zustand";

export type DocStatus = "concept" | "verzonden" | "betaald" | "openstaand";
export type DocType   = "factuur" | "offerte";
export type DocLang   = "nl" | "en";

export interface LineItem {
  id: string;
  product: string;
  description: string;
  quantity?: number;
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
  recurringInvoice?: {
    enabled: boolean;
    frequency: "monthly" | "quarterly" | "yearly";
    amount: number;
    description: string;
    nextDate: string;
    nextTime?: string;
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
  contactEmail?: string;
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

export interface ClientNote {
  id: string;
  clientId: string;
  text: string;
  createdAt: string;
  author: string;
}

export interface LineTemplate {
  id: string;
  title: string;
  product: string;
  description: string;
  price: number;
}

export type EmailProvider = "resend" | "sendgrid" | "gmail" | "none";

export interface EmailTemplatePreset {
  id: string;
  name: string;
  documentSubjectTemplate: string;
  documentHtmlTemplate: string;
  confirmationHtmlTemplate: string;
}

export interface EmailIntegration {
  provider: EmailProvider;
  enabled: boolean;
  fromEmail: string;
  apiKey: string;
  confirmationEmails: string[];
  documentSubjectTemplate: string;
  documentBodyTemplate: string;
  confirmationBodyTemplate: string;
  documentHtmlTemplate: string;
  confirmationHtmlTemplate: string;
  templatePresets: EmailTemplatePreset[];
  selectedTemplatePresetId: string;
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
  name:    "",
  address: "",
  city:    "",
  country: "",
  kvk:     "",
  btw:     "",
  iban:    "",
  email:   "",
  phone:   "",
  website: "",
  signatureLegalText: "",
  footerText: "",
  defaultHourlyRate: 0,
};

const DEFAULT_TEAM: TeamMember[] = [];

const DEFAULT_TEMPLATES: LineTemplate[] = [];

const DEFAULT_EMAIL_INTEGRATION: EmailIntegration = {
  provider: "none",
  enabled: false,
  fromEmail: "",
  apiKey: "",
  confirmationEmails: [],
  documentSubjectTemplate: "",
  documentBodyTemplate: "",
  confirmationBodyTemplate: "",
  documentHtmlTemplate: "",
  confirmationHtmlTemplate: "",
  templatePresets: [],
  selectedTemplatePresetId: "",
};

interface Store {
  // Data
  documents: Document[];
  clients: Client[];
  team: TeamMember[];
  company: CompanySettings;
  clientNotes: ClientNote[];
  lineTemplates: LineTemplate[];
  emailIntegration: EmailIntegration;
  emailLogs: EmailLog[];
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
  hydrateWorkspace: (payload: Partial<Pick<Store, "documents" | "clients" | "team" | "company" | "clientNotes" | "lineTemplates" | "emailIntegration" | "emailLogs">>) => void;
  getWorkspacePayload: () => Pick<Store, "documents" | "clients" | "team" | "company" | "clientNotes" | "lineTemplates" | "emailIntegration" | "emailLogs">;
}

export function calcTotals(items: LineItem[], btwRate: number) {
  const sub   = items.reduce((s, i) => {
    const quantity = Number(i.quantity ?? 1);
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    return s + (i.price || 0) * safeQuantity;
  }, 0);
  const tax   = parseFloat((sub * btwRate / 100).toFixed(2));
  const total = parseFloat((sub + tax).toFixed(2));
  return { sub, tax, total };
}

export function genId(docs: Document[]): string {
  const year = new Date().getFullYear();
  const nums = docs
    .filter((d) => d.id.includes(String(year)))
    .map((d) => Number.parseInt((d.id.split("-")[2] || "").trim(), 10))
    .filter((value) => Number.isFinite(value) && value > 0);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `LL-${year}-${String(next).padStart(3, "0")}`;
}

function addMonths(dateString: string, months: number): string {
  const source = new Date(dateString);
  const next = new Date(source);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
}

function isRecurringDue(nextDate: string, nextTime: string | undefined, now: Date): boolean {
  if (!nextDate) return false;
  const safeTime = /^\d{2}:\d{2}$/.test(nextTime || "") ? String(nextTime) : "09:00";
  const dueAt = new Date(`${nextDate}T${safeTime}:00`);
  if (Number.isNaN(dueAt.getTime())) return nextDate <= now.toISOString().slice(0, 10);
  return dueAt.getTime() <= now.getTime();
}

export function daysOverdue(dueDate: string, today = new Date().toISOString().slice(0, 10)): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const now = new Date(today);
  const diffMs = now.getTime() - due.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getQuarter(date: string): string {
  const year = date.slice(0, 4);
  const month = Number(date.slice(5, 7));
  const quarter = Math.floor((month - 1) / 3) + 1;
  return `${year}-Q${quarter}`;
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


export const useStore = create<Store>()(
  (set, get) => ({
      documents: [],
      clients:   [],
      team:      DEFAULT_TEAM,
      company:   DEFAULT_COMPANY,
      clientNotes: [],
      lineTemplates: DEFAULT_TEMPLATES,
      emailIntegration: DEFAULT_EMAIL_INTEGRATION,
      emailLogs: [],
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
      addClientNote: (note) => set((s) => ({
        clientNotes: [note, ...s.clientNotes],
      })),
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
        const now = new Date();
        set((s) => {
          const toAdd: Document[] = [];
          const nextClients = s.clients.map((client) => {
            const recurring = client.recurringInvoice;
            if (!recurring?.enabled || !recurring.nextDate) return client;
            if (!isRecurringDue(recurring.nextDate, recurring.nextTime, now)) return client;
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
                nextTime: recurring.nextTime || "09:00",
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
          items: (d.items ?? []).map((item) => ({
            ...item,
            quantity: Number(item.quantity ?? 1) || 1,
          })),
          timeEntries: d.timeEntries ?? [],
          timeHourlyRate: d.timeHourlyRate ?? DEFAULT_COMPANY.defaultHourlyRate,
        })),
        clients: (payload.clients ?? []).map((c) => ({
          ...c,
          recurringInvoice: c.recurringInvoice
            ? {
                ...c.recurringInvoice,
                nextTime: c.recurringInvoice.nextTime || "09:00",
              }
            : c.recurringInvoice,
        })),
        team: payload.team ?? DEFAULT_TEAM,
        company: { ...DEFAULT_COMPANY, ...(payload.company ?? {}) },
        clientNotes: payload.clientNotes ?? [],
        lineTemplates: payload.lineTemplates ?? DEFAULT_TEMPLATES,
        emailIntegration: { ...DEFAULT_EMAIL_INTEGRATION, ...(payload.emailIntegration ?? {}) },
        emailLogs: payload.emailLogs ?? [],
        hasLoadedWorkspace: true,
      })),
      getWorkspacePayload: () => {
        const state = get();
        return {
          documents: state.documents,
          clients: state.clients,
          team: state.team,
          company: state.company,
          clientNotes: state.clientNotes,
          lineTemplates: state.lineTemplates,
          emailIntegration: state.emailIntegration,
          emailLogs: state.emailLogs,
        };
      },
    })
);
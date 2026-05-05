import { z } from "zod";

export const registerSchema = z.object({
  token: z.string().min(20).max(256),
  name: z.string().max(120).optional().default(""),
  password: z
    .string()
    .min(16, "Wachtwoord moet minimaal 16 tekens bevatten.")
    .max(128)
    .refine((value) => /[a-z]/.test(value), "Wachtwoord moet een kleine letter bevatten.")
    .refine((value) => /[A-Z]/.test(value), "Wachtwoord moet een hoofdletter bevatten.")
    .refine((value) => /\d/.test(value), "Wachtwoord moet een cijfer bevatten.")
    .refine((value) => /[^A-Za-z0-9]/.test(value), "Wachtwoord moet een speciaal teken bevatten."),
}).strict();

export const profileUpdateSchema = z.object({
  name: z.string().max(120).optional(),
  password: z.string().min(8).max(128).optional(),
  invoiceName: z.string().max(120).optional(),
  invoiceEmail: z.string().email().max(200).optional().or(z.literal("")),
  invoicePhone: z.string().max(40).optional(),
  themePreference: z.enum(["light", "dark", "system"]).optional(),
}).strict();

export const usersPatchSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "admin"]).optional(),
  name: z.string().max(120).optional(),
}).strict();

export const usersDeleteSchema = z.object({
  id: z.string().min(1),
}).strict();

export const usersInviteSchema = z.object({
  email: z.string().email().trim(),
  name: z.string().max(120).optional().default(""),
}).strict();

export const sendDocumentSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  text: z.string().min(1).max(20000),
  html: z.string().max(100000).optional(),
  sendConfirmation: z.boolean().optional(),
  confirmationText: z.string().max(20000).optional(),
  confirmationHtml: z.string().max(100000).optional(),
  attachmentBase64: z.string().optional(),
  attachmentFileName: z.string().max(255).optional(),
  attachmentMimeType: z.string().max(120).optional(),
}).strict();

const boundedString = z.string().max(5_000);
const boundedNumber = z.number().finite();
const boundedBoolean = z.boolean();

// Permit nested dynamic settings content while still bounding payload size and shape.
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    boundedString,
    boundedNumber,
    boundedBoolean,
    z.null(),
    z.array(jsonValueSchema).max(5_000),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const companySettingsSchema = z.object({
  name: z.string().max(120),
  address: z.string().max(200),
  city: z.string().max(120),
  country: z.string().max(120),
  kvk: z.string().max(80),
  btw: z.string().max(80),
  iban: z.string().max(80),
  email: z.string().max(200),
  phone: z.string().max(40),
  website: z.string().max(200),
  signatureLegalText: z.string().max(5_000),
  footerText: z.string().max(5_000),
  defaultHourlyRate: z.number().finite().min(0).max(100_000),
}).strict();

const emailTemplatePresetSchema = z.object({
  id: z.string().max(120),
  name: z.string().max(120),
  documentSubjectTemplate: z.string().max(2_000),
  documentHtmlTemplate: z.string().max(100_000),
  confirmationHtmlTemplate: z.string().max(100_000),
}).strict();

const emailIntegrationSchema = z.object({
  provider: z.enum(["resend", "sendgrid", "gmail", "none"]),
  enabled: z.boolean(),
  fromEmail: z.string().max(200),
  apiKey: z.string().max(1_000),
  confirmationEmails: z.array(z.string().email().max(200)).max(100),
  documentSubjectTemplate: z.string().max(2_000),
  documentBodyTemplate: z.string().max(100_000),
  confirmationBodyTemplate: z.string().max(100_000),
  documentHtmlTemplate: z.string().max(100_000),
  confirmationHtmlTemplate: z.string().max(100_000),
  templatePresets: z.array(emailTemplatePresetSchema).max(100),
  selectedTemplatePresetId: z.string().max(120),
}).strict();

export const settingsPayloadSchema = z.object({
  documents: z.array(jsonValueSchema).max(10_000).optional(),
  team: z.array(jsonValueSchema).max(2_000).optional(),
  company: companySettingsSchema.optional(),
  clientNotes: z.array(jsonValueSchema).max(10_000).optional(),
  lineTemplates: z.array(jsonValueSchema).max(10_000).optional(),
  emailIntegration: emailIntegrationSchema.optional(),
}).strict();

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

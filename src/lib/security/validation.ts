import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().trim(),
  password: z.string().min(8).max(128),
  name: z.string().max(120).optional().default(""),
}).strict();

export const profileUpdateSchema = z.object({
  name: z.string().max(120).optional(),
  password: z.string().min(8).max(128).optional(),
}).strict();

export const usersPatchSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "admin"]).optional(),
  name: z.string().max(120).optional(),
}).strict();

export const sendDocumentSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  text: z.string().min(1).max(20000),
  confirmationText: z.string().max(20000).optional(),
  attachmentBase64: z.string().optional(),
  attachmentFileName: z.string().max(255).optional(),
  attachmentMimeType: z.string().max(120).optional(),
}).strict();

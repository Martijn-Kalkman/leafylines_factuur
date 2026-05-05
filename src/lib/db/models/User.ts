import { model, models, Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "" },
    invoiceName: { type: String, default: "" },
    invoiceEmail: { type: String, default: "" },
    invoicePhone: { type: String, default: "" },
    themePreference: { type: String, enum: ["light", "dark", "system"], default: "system" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    inviteTokenHash: { type: String, default: "" },
    inviteTokenExpiresAt: { type: Date, default: null },
    inviteAcceptedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type DbUser = InferSchemaType<typeof userSchema>;

export const UserModel = models.User || model("User", userSchema);

export async function ensureUserRoleField(): Promise<void> {
  await UserModel.collection.updateMany(
    {
      $or: [
        { role: { $exists: false } },
        { role: null },
        { role: "" },
      ],
    },
    {
      $set: { role: "user" },
    },
  );
}

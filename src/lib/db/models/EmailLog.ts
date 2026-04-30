import { model, models, Schema } from "mongoose";

const emailLogSchema = new Schema(
  {
    createdAt: { type: String, required: true, index: true },
    sentAt: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    to: { type: String, required: true },
    kind: { type: String, enum: ["document", "confirmation"], required: true },
    status: { type: String, enum: ["success", "failed"], required: true },
    error: { type: String, default: "" },
    sentBy: { type: String, default: "" },
  },
  { versionKey: false, collection: "emails" },
);

export const EmailLogModel = models.EmailLog || model("EmailLog", emailLogSchema);

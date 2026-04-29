import { model, models, Schema } from "mongoose";

const klantSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    company: { type: String, default: "" },
    contactName: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    notes: { type: String, default: "" },
    supportHoursRemaining: { type: Number, default: 0 },
    supportCycleStart: { type: String, default: "" },
    recurringInvoice: { type: Schema.Types.Mixed, default: null },
  },
  { versionKey: false, collection: "klanten" },
);

export const KlantModel = models.Klant || model("Klant", klantSchema);

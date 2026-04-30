import { model, models, Schema } from "mongoose";

const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true, default: "global" },
    documents: { type: [Schema.Types.Mixed], default: [] },
    team: { type: [Schema.Types.Mixed], default: [] },
    company: { type: Schema.Types.Mixed, default: {} },
    clientNotes: { type: [Schema.Types.Mixed], default: [] },
    lineTemplates: { type: [Schema.Types.Mixed], default: [] },
    emailIntegration: { type: Schema.Types.Mixed, default: {} },
    auditLogs: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true, collection: "settings" },
);

export const SettingModel = models.Setting || model("Setting", settingSchema);

import { SettingModel } from "@/lib/db/models/Setting";
import { connectToDatabase } from "@/lib/db/mongodb";

export async function appendAuditLog(userId: string, action: string, metadata?: Record<string, unknown>) {
  await connectToDatabase();
  await SettingModel.findOneAndUpdate(
    { key: "global" },
    {
      $push: {
        auditLogs: {
          $each: [
            {
              id: Math.random().toString(36).slice(2, 9),
              createdAt: new Date().toISOString(),
              action,
              actorUserId: userId,
              metadata: metadata ?? {},
            },
          ],
          $position: 0,
          $slice: 2000,
        },
      },
    },
    { upsert: true },
  );
}

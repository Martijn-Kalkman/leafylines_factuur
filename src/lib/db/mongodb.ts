import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var __mongooseConnection: Promise<typeof mongoose> | undefined;
  // eslint-disable-next-line no-var
  var __mongooseConfigured: boolean | undefined;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const configuredUri = (process.env.MONGODB_URI || "").trim();
  const mongoUri =
    process.env.NODE_ENV !== "production" && configuredUri.includes("cluster.mongodb.net")
      ? "mongodb://127.0.0.1:27017/leafylines"
      : configuredUri || "mongodb://127.0.0.1:27017/leafylines";
  const dbName = (process.env.MONGODB_DB_NAME || "leafylines").trim();
  if (!global.__mongooseConfigured) {
    mongoose.set("strictQuery", true);
    mongoose.set("sanitizeFilter", true);
    global.__mongooseConfigured = true;
  }
  if (!global.__mongooseConnection) {
    global.__mongooseConnection = mongoose.connect(mongoUri, {
      dbName,
    });
  }

  return global.__mongooseConnection;
}

import mongoose from "mongoose";

declare global {
  var __mongooseConnection: Promise<typeof mongoose> | undefined;
  var __mongooseConfigured: boolean | undefined;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const configuredUri = (process.env.MONGODB_URI || "").trim();
  const mongoUri = configuredUri || "mongodb://127.0.0.1:27017/leafylines";
  const dbName = (process.env.MONGODB_DB_NAME || "leafylines").trim();
  if (!global.__mongooseConfigured) {
    mongoose.set("strictQuery", true);
    mongoose.set("sanitizeFilter", true);
    global.__mongooseConfigured = true;
  }
  if (!global.__mongooseConnection) {
    global.__mongooseConnection = mongoose
      .connect(mongoUri, {
        dbName,
        serverSelectionTimeoutMS: 5000,
      })
      .catch((error) => {
        // Allow the next request to retry instead of keeping a rejected promise forever.
        global.__mongooseConnection = undefined;
        throw error;
      });
  }

  return global.__mongooseConnection;
}

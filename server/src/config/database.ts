import mongoose from "mongoose";
import { env } from "./env";

export type DatabaseStatus =
  | "not_configured"
  | "connecting"
  | "connected"
  | "unavailable";

let databaseStatus: DatabaseStatus = env.mongodbUri
  ? "connecting"
  : "not_configured";

export async function connectToDatabase(): Promise<void> {
  if (!env.mongodbUri) {
    console.info("MONGODB_URI is not configured; starting without MongoDB.");
    return;
  }

  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
    databaseStatus = "connected";
    console.info("Connected to MongoDB.");
  } catch (error) {
    databaseStatus = "unavailable";
    const message =
      error instanceof Error ? error.message : "Unknown connection error";
    console.warn(`MongoDB is unavailable; the API will still start. ${message}`);
  }
}

export function getDatabaseStatus(): DatabaseStatus {
  return databaseStatus;
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

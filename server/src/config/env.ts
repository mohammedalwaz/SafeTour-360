import { resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), "server/.env") });

const parsedPort = Number(process.env.PORT);

const frontendUrl = process.env.FRONTEND_URL?.trim() || "http://localhost:5000";
const corsOrigins = (process.env.CORS_ORIGINS?.trim() || frontendUrl)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  port: Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 8000,
  frontendUrl,
  corsOrigins,
  publicAppUrl:
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    frontendUrl,
  mongodbUri: process.env.MONGODB_URI?.trim() || "",
  jwtSecret:
    process.env.JWT_SECRET?.trim() || process.env.SESSION_SECRET?.trim() || "",
};

import { resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), "server/.env") });

const parsedPort = Number(process.env.PORT);

export const env = {
  port: Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 8000,
  frontendUrl: process.env.FRONTEND_URL?.trim() || "http://localhost:5000",
  mongodbUri: process.env.MONGODB_URI?.trim() || "",
};

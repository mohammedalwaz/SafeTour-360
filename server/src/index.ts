import { createServer } from "node:http";
import app from "./app";
import { connectToDatabase } from "./config/database";
import { env } from "./config/env";
import { attachSocketServer } from "./sockets/socket-server";

async function startServer(): Promise<void> {
  await connectToDatabase();

  if (!env.jwtSecret) {
    console.warn(
      "JWT_SECRET is not configured; authentication endpoints will be unavailable.",
    );
  }

  const httpServer = createServer(app);
  attachSocketServer(httpServer);

  httpServer.listen(env.port, "0.0.0.0", () => {
    console.info(`SafeTour 360 API listening on port ${env.port}.`);
  });
}

void startServer().catch((error: unknown) => {
  console.error("The API server could not start:", error);
  process.exitCode = 1;
});

import app from "./app";
import { connectToDatabase } from "./config/database";
import { env } from "./config/env";

async function startServer(): Promise<void> {
  await connectToDatabase();

  app.listen(env.port, "0.0.0.0", () => {
    console.info(`SafeTour 360 API listening on port ${env.port}.`);
  });
}

void startServer().catch((error: unknown) => {
  console.error("The API server could not start:", error);
  process.exitCode = 1;
});

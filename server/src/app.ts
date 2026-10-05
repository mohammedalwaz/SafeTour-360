import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import healthRouter from "./routes/health.routes";

const app = express();

app.use(cors({ origin: env.frontendUrl }));
app.use(express.json());
app.use("/api/health", healthRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

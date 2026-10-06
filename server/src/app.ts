import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import adminRouter from "./routes/admin.routes";
import healthRouter from "./routes/health.routes";
import authRouter from "./modules/auth/auth.routes";
import touristRouter from "./routes/tourist.routes";
import verifyRouter from "./routes/verify.routes";

const app = express();

app.use(cors({ origin: env.corsOrigins }));
app.use(express.json({ limit: "100kb" }));
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/tourist", touristRouter);
app.use("/api/admin", adminRouter);
app.use("/api/verify", verifyRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

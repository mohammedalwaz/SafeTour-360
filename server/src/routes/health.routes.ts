import { Router } from "express";
import { getDatabaseStatus } from "../config/database";

const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.status(200).json({
    status: "ok",
    service: "SafeTour 360 API",
    database: getDatabaseStatus(),
  });
});

export default healthRouter;

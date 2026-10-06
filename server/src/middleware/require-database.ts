import type { RequestHandler } from "express";
import { isDatabaseConnected } from "../config/database";

export const requireDatabase: RequestHandler = (_request, response, next) => {
  if (!isDatabaseConnected()) {
    response.status(503).json({
      message:
        "This action requires a configured and available MongoDB connection.",
    });
    return;
  }

  next();
};

import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  console.error("Request error:", error);
  response.status(500).json({ message: "An unexpected error occurred." });
};

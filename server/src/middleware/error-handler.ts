import mongoose from "mongoose";
import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error instanceof mongoose.Error.ValidationError) {
    const firstError = Object.values(error.errors)[0];
    response.status(400).json({
      message: firstError?.message || "The submitted data is not valid.",
    });
    return;
  }

  console.error("Request error:", error);
  response.status(500).json({ message: "An unexpected error occurred." });
};

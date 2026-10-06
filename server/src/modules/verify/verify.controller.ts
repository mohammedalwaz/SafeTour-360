import type { RequestHandler } from "express";
import { isDatabaseConnected } from "../../config/database";
import { verifyDigitalIdToken } from "../../services/digital-id";

export const verifyDigitalId: RequestHandler = async (request, response, next) => {
  if (!isDatabaseConnected()) {
    response.status(503).json({
      message:
        "Digital ID verification requires a configured and available MongoDB connection.",
    });
    return;
  }

  const token = Array.isArray(request.params.token)
  ? request.params.token[0]
  : request.params.token;
  if (!token) {
    response.status(400).json({ message: "A verification token is required." });
    return;
  }

  try {
    const result = await verifyDigitalIdToken(token);
    if (result.status === "invalid") {
      response.status(404).json({
        valid: false,
        status: "invalid",
        message: "This Digital ID token is not valid.",
      });
      return;
    }

    if (result.status === "revoked" || result.status === "expired") {
      response.status(410).json({
        valid: false,
        status: result.status,
        idNumber: result.record.idNumber,
        message:
          result.status === "revoked"
            ? "This Digital ID has been revoked."
            : "This Digital ID has expired.",
      });
      return;
    }

    response.status(200).json({
      valid: true,
      status: "valid",
      holder: result.holder,
      message: "This Digital ID is valid. It is a secure token/QR check, not a blockchain record.",
    });
  } catch (error) {
    next(error);
  }
};

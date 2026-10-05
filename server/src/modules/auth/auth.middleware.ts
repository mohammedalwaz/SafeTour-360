import type { RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { isDatabaseConnected } from "../../config/database";
import { env } from "../../config/env";
import { UserModel, USER_ROLES, type UserRole } from "../../models/User";
import { toPublicUser } from "./auth.utils";

function sendUnauthorized(response: Parameters<RequestHandler>[1]): void {
  response.status(401).json({ message: "A valid login is required." });
}

export const authenticate: RequestHandler = async (
  request,
  response,
  next,
) => {
  const authorization = request.get("authorization");
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    sendUnauthorized(response);
    return;
  }

  if (!env.jwtSecret) {
    response.status(503).json({
      message: "Authentication is unavailable until a JWT secret is configured.",
    });
    return;
  }

  let payload: JwtPayload;
  try {
    const verified = jwt.verify(match[1], env.jwtSecret, {
      algorithms: ["HS256"],
    });
    if (typeof verified === "string") {
      sendUnauthorized(response);
      return;
    }
    payload = verified;
  } catch {
    sendUnauthorized(response);
    return;
  }

  if (
    typeof payload.sub !== "string" ||
    typeof payload.role !== "string" ||
    !USER_ROLES.includes(payload.role as UserRole)
  ) {
    sendUnauthorized(response);
    return;
  }

  if (!isDatabaseConnected()) {
    response.status(503).json({
      message: "Authentication requires a configured MongoDB connection.",
    });
    return;
  }

  try {
    const user = await UserModel.findById(payload.sub).select(
      "name email phone role isActive createdAt updatedAt",
    );

    if (!user || !user.isActive || user.role !== payload.role) {
      sendUnauthorized(response);
      return;
    }

    request.auth = {
      userId: user._id.toString(),
      role: user.role,
      user: toPublicUser(user),
    };
    next();
  } catch (error) {
    next(error);
  }
};

export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (request, response, next) => {
    if (!request.auth) {
      sendUnauthorized(response);
      return;
    }

    if (!allowedRoles.includes(request.auth.role)) {
      response.status(403).json({
        message: "Your account does not have permission to access this resource.",
      });
      return;
    }

    next();
  };
}

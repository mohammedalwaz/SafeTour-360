import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { isDatabaseConnected } from "../config/database";
import { env } from "../config/env";
import { UserModel, USER_ROLES, type UserRole } from "../models/User";

let socketServer: Server | null = null;

interface SocketIdentity {
  userId: string;
  role: UserRole;
}

export function attachSocketServer(server: HttpServer): void {
  socketServer = new Server(server, {
    cors: {
      origin: env.frontendUrl,
      methods: ["GET", "POST"],
    },
  });

  socketServer.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !env.jwtSecret) {
      next(new Error("A valid login is required for live updates."));
      return;
    }

    let payload: JwtPayload;
    try {
      const verified = jwt.verify(token, env.jwtSecret, {
        algorithms: ["HS256"],
      });
      if (typeof verified === "string") {
        next(new Error("A valid login is required for live updates."));
        return;
      }
      payload = verified;
    } catch {
      next(new Error("A valid login is required for live updates."));
      return;
    }

    if (
      typeof payload.sub !== "string" ||
      typeof payload.role !== "string" ||
      !USER_ROLES.includes(payload.role as UserRole) ||
      !isDatabaseConnected()
    ) {
      next(new Error("Live updates require an active MongoDB account."));
      return;
    }

    try {
      const user = await UserModel.findById(payload.sub).select(
        "role isActive",
      );
      if (!user || !user.isActive || user.role !== payload.role) {
        next(new Error("A valid active account is required for live updates."));
        return;
      }

      socket.data.identity = {
        userId: user._id.toString(),
        role: user.role,
      } satisfies SocketIdentity;
      next();
    } catch {
      next(new Error("Could not verify this account for live updates."));
    }
  });

  socketServer.on("connection", (socket) => {
    const identity = socket.data.identity as SocketIdentity;
    if (identity.role === "admin") {
      void socket.join("admins");
    } else {
      void socket.join(`tourist:${identity.userId}`);
    }
  });
}

export function emitToAdmins(event: string, payload: unknown): void {
  socketServer?.to("admins").emit(event, payload);
}

export function emitToTourist(
  touristId: string,
  event: string,
  payload: unknown,
): void {
  socketServer?.to(`tourist:${touristId}`).emit(event, payload);
}
